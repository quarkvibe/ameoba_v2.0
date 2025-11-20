import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface OutputChannel {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'email' | 'webhook' | 'file' | 'database' | 'redis' | 's3';
  config: {
    api?: {
      endpoint: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH';
      headers?: Record<string, string>;
      bodyTemplate?: string;
    };
    email?: {
      provider: 'sendgrid' | 'ses' | 'smtp';
      templates: {
        subject: string;
        htmlTemplate: string;
        textTemplate?: string;
      };
      recipients: {
        type: 'static' | 'dynamic' | 'list';
        addresses?: string[];
        listId?: string;
        dynamicField?: string;
      };
    };
    webhook?: {
      url: string;
      secret?: string;
      headers?: Record<string, string>;
      payloadTemplate?: string;
    };
    file?: {
      path: string;
      format: 'json' | 'csv' | 'xml' | 'txt' | 'markdown';
      template?: string;
    };
    database?: {
      table: string;
      columns: Record<string, string>;
    };
  };
  outputFormat: {
    contentField: string;
    metadataFields?: string[];
    template?: string;
    postProcessing?: Array<{
      operation: 'minify' | 'format' | 'encrypt' | 'compress' | 'validate';
      parameters?: any;
    }>;
  };
  isActive: boolean;
  lastUsed?: string;
  totalDeliveries?: number;
  failureCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface DistributionRule {
  id: string;
  name: string;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
    value: string;
  }>;
  channels: string[];
  isActive: boolean;
}

export default function OutputConfiguration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("channels");
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<OutputChannel | null>(null);
  const [editingRule, setEditingRule] = useState<DistributionRule | null>(null);

  // Get output channels
  const { data: channels, isLoading: channelsLoading } = useQuery<OutputChannel[]>({
    queryKey: ["/api/output/channels"],
    refetchInterval: 30000,
  });

  // Get distribution rules
  const { data: rules, isLoading: rulesLoading } = useQuery<DistributionRule[]>({
    queryKey: ["/api/output/rules"],
    refetchInterval: 30000,
  });

  // Channel mutations
  const createChannelMutation = useMutation({
    mutationFn: (channel: Partial<OutputChannel>) => 
      apiRequest("POST", "/api/output/channels", channel),
    onSuccess: () => {
      toast({ title: "Success", description: "Output channel created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/output/channels"] });
      setIsChannelDialogOpen(false);
      setEditingChannel(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: ({ id, ...channel }: Partial<OutputChannel> & { id: string }) => 
      apiRequest("PUT", `/api/output/channels/${id}`, channel),
    onSuccess: () => {
      toast({ title: "Success", description: "Output channel updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/output/channels"] });
      setIsChannelDialogOpen(false);
      setEditingChannel(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/output/channels/${id}`),
    onSuccess: () => {
      toast({ title: "Success", description: "Output channel deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/output/channels"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testChannelMutation = useMutation({
    mutationFn: ({ id, testData }: { id: string; testData: any }) => 
      apiRequest("POST", `/api/output/channels/${id}/test`, { testData }),
    onSuccess: () => {
      toast({ title: "Test Successful", description: "Output channel is working correctly." });
    },
    onError: (error) => {
      toast({ title: "Test Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleChannelSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const channelData: Partial<OutputChannel> = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as OutputChannel['type'],
      config: {},
      outputFormat: {
        contentField: formData.get('contentField') as string || 'content',
        template: formData.get('template') as string,
      },
      isActive: formData.get('isActive') === 'on',
    };

    // Configure based on type
    const type = channelData.type!;
    switch (type) {
      case 'api':
        channelData.config!.api = {
          endpoint: formData.get('endpoint') as string,
          method: (formData.get('method') as any) || 'POST',
          bodyTemplate: formData.get('bodyTemplate') as string,
        };
        break;
      case 'email':
        channelData.config!.email = {
          provider: (formData.get('emailProvider') as any) || 'sendgrid',
          templates: {
            subject: formData.get('emailSubject') as string,
            htmlTemplate: formData.get('emailTemplate') as string,
          },
          recipients: {
            type: 'static',
            addresses: [formData.get('emailRecipients') as string],
          },
        };
        break;
      case 'webhook':
        channelData.config!.webhook = {
          url: formData.get('webhookUrl') as string,
          payloadTemplate: formData.get('webhookTemplate') as string,
        };
        break;
      case 'file':
        channelData.config!.file = {
          path: formData.get('filePath') as string,
          format: (formData.get('fileFormat') as any) || 'json',
          template: formData.get('fileTemplate') as string,
        };
        break;
    }

    if (editingChannel) {
      updateChannelMutation.mutate({ id: editingChannel.id, ...channelData });
    } else {
      createChannelMutation.mutate(channelData);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'api': return 'fas fa-globe';
      case 'email': return 'fas fa-envelope';
      case 'webhook': return 'fas fa-webhook';
      case 'file': return 'fas fa-file';
      case 'database': return 'fas fa-database';
      case 'redis': return 'fas fa-memory';
      case 's3': return 'fab fa-aws';
      default: return 'fas fa-share-alt';
    }
  };

  const getStatusColor = (channel: OutputChannel) => {
    if (!channel.isActive) return 'bg-muted text-muted-foreground';
    if (channel.failureCount && channel.failureCount > 0) return 'bg-yellow-500 text-white';
    if (channel.totalDeliveries && channel.totalDeliveries > 0) return 'bg-accent text-accent-foreground';
    return 'bg-muted text-muted-foreground';
  };

  if (channelsLoading || rulesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-share-alt text-primary"></i>
            Output & Distribution Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="channels">Output Channels</TabsTrigger>
              <TabsTrigger value="formatting">Content Formatting</TabsTrigger>
              <TabsTrigger value="rules">Distribution Rules</TabsTrigger>
            </TabsList>

            {/* Output Channels Tab */}
            <TabsContent value="channels" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Output Channels</h3>
                <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-channel">
                      <i className="fas fa-plus mr-2"></i>
                      Add Channel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingChannel ? 'Edit' : 'Create'} Output Channel
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh]">
                      <form onSubmit={handleChannelSubmit} className="space-y-6 p-1">
                        <Tabs defaultValue="basic" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="config">Configuration</TabsTrigger>
                            <TabsTrigger value="formatting">Output Format</TabsTrigger>
                          </TabsList>

                          {/* Basic Information */}
                          <TabsContent value="basic" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="name">Channel Name</Label>
                                <Input
                                  id="name"
                                  name="name"
                                  placeholder="e.g., Blog API Endpoint"
                                  defaultValue={editingChannel?.name}
                                  required
                                  data-testid="input-channel-name"
                                />
                              </div>
                              <div>
                                <Label htmlFor="type">Channel Type</Label>
                                <Select name="type" defaultValue={editingChannel?.type || 'api'}>
                                  <SelectTrigger data-testid="select-channel-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="api">API Endpoint</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="webhook">Webhook</SelectItem>
                                    <SelectItem value="file">File Output</SelectItem>
                                    <SelectItem value="database">Database</SelectItem>
                                    <SelectItem value="redis">Redis</SelectItem>
                                    <SelectItem value="s3">S3 Storage</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                name="description"
                                placeholder="Describe where this channel sends generated content"
                                defaultValue={editingChannel?.description}
                                rows={3}
                                data-testid="textarea-channel-description"
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <Switch
                                id="isActive"
                                name="isActive"
                                defaultChecked={editingChannel?.isActive ?? true}
                                data-testid="switch-channel-active"
                              />
                              <Label htmlFor="isActive">Active</Label>
                            </div>
                          </TabsContent>

                          {/* Configuration */}
                          <TabsContent value="config" className="space-y-4">
                            <div className="space-y-4">
                              {/* API Configuration */}
                              <div className="border rounded-lg p-4">
                                <h4 className="font-medium mb-3">API Configuration</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="endpoint">Endpoint URL</Label>
                                    <Input
                                      id="endpoint"
                                      name="endpoint"
                                      placeholder="https://api.example.com/content"
                                      defaultValue={editingChannel?.config.api?.endpoint}
                                      data-testid="input-api-endpoint"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="method">HTTP Method</Label>
                                    <Select name="method" defaultValue={editingChannel?.config.api?.method || 'POST'}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="POST">POST</SelectItem>
                                        <SelectItem value="PUT">PUT</SelectItem>
                                        <SelectItem value="PATCH">PATCH</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="mt-4">
                                  <Label htmlFor="bodyTemplate">Request Body Template</Label>
                                  <Textarea
                                    id="bodyTemplate"
                                    name="bodyTemplate"
                                    placeholder='{"title": "{{title}}", "content": "{{content}}", "date": "{{date}}"}'
                                    defaultValue={editingChannel?.config.api?.bodyTemplate}
                                    rows={4}
                                    data-testid="textarea-body-template"
                                  />
                                </div>
                              </div>

                              {/* Email Configuration */}
                              <div className="border rounded-lg p-4">
                                <h4 className="font-medium mb-3">Email Configuration</h4>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor="emailProvider">Email Provider</Label>
                                      <Select name="emailProvider" defaultValue="sendgrid">
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="sendgrid">SendGrid</SelectItem>
                                          <SelectItem value="ses">AWS SES</SelectItem>
                                          <SelectItem value="smtp">SMTP</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label htmlFor="emailSubject">Subject Template</Label>
                                      <Input
                                        id="emailSubject"
                                        name="emailSubject"
                                        placeholder="Daily {{contentType}} - {{date}}"
                                        defaultValue={editingChannel?.config.email?.templates.subject}
                                        data-testid="input-email-subject"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <Label htmlFor="emailTemplate">HTML Template</Label>
                                    <Textarea
                                      id="emailTemplate"
                                      name="emailTemplate"
                                      placeholder="<h1>{{title}}</h1><p>{{content}}</p>"
                                      defaultValue={editingChannel?.config.email?.templates.htmlTemplate}
                                      rows={6}
                                      data-testid="textarea-email-template"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="emailRecipients">Recipients (comma-separated)</Label>
                                    <Input
                                      id="emailRecipients"
                                      name="emailRecipients"
                                      placeholder="user@example.com, admin@example.com"
                                      defaultValue={editingChannel?.config.email?.recipients.addresses?.join(', ')}
                                      data-testid="input-email-recipients"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* File Configuration */}
                              <div className="border rounded-lg p-4">
                                <h4 className="font-medium mb-3">File Output Configuration</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="filePath">Output Path</Label>
                                    <Input
                                      id="filePath"
                                      name="filePath"
                                      placeholder="/var/output/content.json"
                                      defaultValue={editingChannel?.config.file?.path}
                                      data-testid="input-file-path"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="fileFormat">File Format</Label>
                                    <Select name="fileFormat" defaultValue={editingChannel?.config.file?.format || 'json'}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="json">JSON</SelectItem>
                                        <SelectItem value="csv">CSV</SelectItem>
                                        <SelectItem value="xml">XML</SelectItem>
                                        <SelectItem value="txt">Text</SelectItem>
                                        <SelectItem value="markdown">Markdown</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="mt-4">
                                  <Label htmlFor="fileTemplate">File Template</Label>
                                  <Textarea
                                    id="fileTemplate"
                                    name="fileTemplate"
                                    placeholder="Custom file format template using {{variables}}"
                                    defaultValue={editingChannel?.config.file?.template}
                                    rows={4}
                                    data-testid="textarea-file-template"
                                  />
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          {/* Output Formatting */}
                          <TabsContent value="formatting" className="space-y-4">
                            <div>
                              <Label htmlFor="contentField">Content Field Name</Label>
                              <Input
                                id="contentField"
                                name="contentField"
                                placeholder="content"
                                defaultValue={editingChannel?.outputFormat.contentField || 'content'}
                                data-testid="input-content-field"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Field name for the generated content in the output
                              </p>
                            </div>

                            <div>
                              <Label htmlFor="template">Output Template</Label>
                              <Textarea
                                id="template"
                                name="template"
                                placeholder="{{content}} - Generated on {{date}}"
                                defaultValue={editingChannel?.outputFormat.template}
                                rows={6}
                                data-testid="textarea-output-template"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Template for formatting the final output. Use {`{{field}}`} for variables.
                              </p>
                            </div>

                            <div className="border rounded-lg p-4">
                              <h4 className="font-medium mb-2">Post-Processing</h4>
                              <p className="text-sm text-muted-foreground mb-4">
                                Configure how content is processed before delivery
                              </p>
                              <div className="text-center py-4 text-muted-foreground">
                                <i className="fas fa-cogs text-2xl mb-2"></i>
                                <p className="text-sm">Advanced post-processing coming soon</p>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button type="button" variant="outline" onClick={() => setIsChannelDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createChannelMutation.isPending || updateChannelMutation.isPending}
                            data-testid="button-save-channel"
                          >
                            {createChannelMutation.isPending || updateChannelMutation.isPending ? 'Saving...' : 'Save Channel'}
                          </Button>
                        </div>
                      </form>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {channels?.map((channel) => (
                  <Card key={channel.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <i className={`${getTypeIcon(channel.type)} text-primary`}></i>
                            <h4 className="font-semibold">{channel.name}</h4>
                            <Badge variant={channel.isActive ? "default" : "secondary"}>
                              {channel.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">{channel.type}</Badge>
                            <Badge className={getStatusColor(channel)}>
                              {channel.totalDeliveries ? `${channel.totalDeliveries} sent` : 'Unused'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{channel.description}</p>
                          <div className="text-xs text-muted-foreground">
                            {channel.type === 'api' && channel.config.api && (
                              <div>Endpoint: {channel.config.api.endpoint}</div>
                            )}
                            {channel.type === 'email' && channel.config.email && (
                              <div>Provider: {channel.config.email.provider}</div>
                            )}
                            {channel.type === 'file' && channel.config.file && (
                              <div>Path: {channel.config.file.path}</div>
                            )}
                            {channel.failureCount && channel.failureCount > 0 && (
                              <div className="text-yellow-600">Failures: {channel.failureCount}</div>
                            )}
                            {channel.lastUsed && (
                              <div>Last Used: {new Date(channel.lastUsed).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testChannelMutation.mutate({ 
                              id: channel.id, 
                              testData: { content: "Test content", title: "Test", date: new Date().toISOString() }
                            })}
                            disabled={testChannelMutation.isPending}
                            data-testid={`button-test-${channel.id}`}
                          >
                            <i className="fas fa-play text-xs"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingChannel(channel);
                              setIsChannelDialogOpen(true);
                            }}
                            data-testid={`button-edit-${channel.id}`}
                          >
                            <i className="fas fa-edit text-xs"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteChannelMutation.mutate(channel.id)}
                            disabled={deleteChannelMutation.isPending}
                            data-testid={`button-delete-${channel.id}`}
                          >
                            <i className="fas fa-trash text-destructive text-xs"></i>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {(!channels || channels.length === 0) && (
                  <div className="text-center py-12">
                    <i className="fas fa-share-alt text-muted-foreground text-4xl mb-4"></i>
                    <p className="text-muted-foreground">No output channels configured</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add output channels to distribute your generated content
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Content Formatting Tab */}
            <TabsContent value="formatting" className="space-y-4">
              <h3 className="text-lg font-semibold">Content Formatting</h3>
              <div className="text-center py-12">
                <i className="fas fa-code text-muted-foreground text-3xl mb-4"></i>
                <p className="text-muted-foreground">Advanced content formatting options</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure how generated content is formatted before distribution
                </p>
              </div>
            </TabsContent>

            {/* Distribution Rules Tab */}
            <TabsContent value="rules" className="space-y-4">
              <h3 className="text-lg font-semibold">Distribution Rules</h3>
              <div className="text-center py-12">
                <i className="fas fa-route text-muted-foreground text-3xl mb-4"></i>
                <p className="text-muted-foreground">Smart distribution rules</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure conditional logic for routing content to different channels
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}