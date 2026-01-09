import * as vscode from 'vscode';

type AgentStatusResponse = {
  ok: boolean;
  name?: string;
  version?: string;
  uptime?: number;
  env?: {
    localUiEnabled?: boolean;
  };
  capabilities?: Record<string, unknown>;
  endpoints?: Record<string, unknown>;
};

class AgentStatusItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly descriptionText?: string,
    public readonly tooltipText?: string,
    public readonly iconId?: string,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = descriptionText;
    this.tooltip = tooltipText;
    this.iconPath = iconId ? new vscode.ThemeIcon(iconId) : undefined;
  }
}

class AgentStatusProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private lastStatus: AgentStatusResponse | null = null;
  private lastError: string | null = null;
  private lastCheckedAt: Date | null = null;

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    await this.ensureStatus();

    const baseUrl = vscode.workspace.getConfiguration('huvrly').get<string>('agent.baseUrl') || 'http://localhost:3001';

    const items: vscode.TreeItem[] = [];

    items.push(new AgentStatusItem('Agent Base URL', baseUrl, baseUrl, 'link'));

    if (this.lastCheckedAt) {
      items.push(new AgentStatusItem('Last Checked', this.lastCheckedAt.toISOString(), this.lastCheckedAt.toISOString(), 'clock'));
    }

    if (this.lastError) {
      items.push(new AgentStatusItem('Status', 'Offline / Error', this.lastError, 'error'));
      items.push(new AgentStatusItem('Error', this.lastError, this.lastError));
      return items;
    }

    if (!this.lastStatus) {
      items.push(new AgentStatusItem('Status', 'Unknown', 'No status available yet', 'question'));
      return items;
    }

    items.push(new AgentStatusItem('Status', this.lastStatus.ok ? 'Online' : 'Unhealthy', JSON.stringify(this.lastStatus, null, 2), this.lastStatus.ok ? 'check' : 'warning'));

    if (this.lastStatus.name) {
      items.push(new AgentStatusItem('Name', this.lastStatus.name));
    }
    if (this.lastStatus.version) {
      items.push(new AgentStatusItem('Version', this.lastStatus.version));
    }
    if (typeof this.lastStatus.uptime === 'number') {
      items.push(new AgentStatusItem('Uptime (s)', String(this.lastStatus.uptime)));
    }

    const localUiEnabled = this.lastStatus.env?.localUiEnabled;
    if (typeof localUiEnabled === 'boolean') {
      items.push(new AgentStatusItem('Local UI Enabled', localUiEnabled ? 'true' : 'false'));
    }

    const caps = this.lastStatus.capabilities;
    if (caps && typeof caps === 'object') {
      items.push(new AgentStatusItem('Capabilities', undefined, JSON.stringify(caps, null, 2), 'tools'));
    }

    return items;
  }

  private async ensureStatus(): Promise<void> {
    // Only fetch once per refresh cycle; cheap debounce.
    if (this.lastCheckedAt && Date.now() - this.lastCheckedAt.getTime() < 3000) {
      return;
    }

    this.lastCheckedAt = new Date();
    this.lastError = null;

    const baseUrlRaw = vscode.workspace.getConfiguration('huvrly').get<string>('agent.baseUrl') || 'http://localhost:3001';
    const url = vscode.Uri.joinPath(vscode.Uri.parse(baseUrlRaw), 'agent', 'status');

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ''}`);
      }

      this.lastStatus = (await res.json()) as AgentStatusResponse;
    } catch (err) {
      this.lastStatus = null;
      this.lastError = err instanceof Error ? err.message : String(err);
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new AgentStatusProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('huvrly.agentStatus', provider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('huvrly.agentStatus.refresh', () => provider.refresh()),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('huvrly.openDocs', async () => {
      const uri = vscode.Uri.parse('https://github.com/huvrly/vscode');
      await vscode.env.openExternal(uri);
    }),
  );

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.name = 'Huvrly Agent';
  status.text = 'Huvrly: Agent';
  status.tooltip = 'Huvrly Agent status';
  status.command = 'huvrly.agentStatus.refresh';
  status.show();
  context.subscriptions.push(status);
}

export function deactivate() {
  // no-op
}
