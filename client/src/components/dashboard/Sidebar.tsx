import { useState } from "react";

const navigation = [
  { id: 'overview', name: 'Overview', icon: 'fas fa-chart-line', active: true },
  { id: 'campaigns', name: 'Campaigns', icon: 'fas fa-envelope', active: false },
  { id: 'configuration', name: 'Configuration', icon: 'fas fa-cog', active: false },
  { id: 'queue', name: 'Queue Monitor', icon: 'fas fa-clock', active: false },
  { id: 'analytics', name: 'Analytics', icon: 'fas fa-chart-bar', active: false },
  { id: 'logs', name: 'Logs', icon: 'fas fa-file-alt', active: false },
  { id: 'agent', name: 'Agent Brain', icon: 'fas fa-brain', active: false },
];

export default function Sidebar() {
  const [activeItem, setActiveItem] = useState('overview');

  const handleNavigation = (itemId: string) => {
    setActiveItem(itemId);
    // TODO: Implement view switching based on navigation
    console.log('Navigating to:', itemId);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border">
      <div className="flex flex-col h-full">
        
        {/* Logo Section */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-atom text-primary-foreground text-sm"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Amoeba</h1>
            <p className="text-xs text-muted-foreground">Email Operations</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeItem === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              data-testid={`nav-${item.id}`}
            >
              <i className={`${item.icon} w-4`}></i>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Status Section */}
        <div className="p-4 border-t border-border">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">System Health</span>
              <span className="text-accent" data-testid="text-system-health">Optimal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">All services online</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
