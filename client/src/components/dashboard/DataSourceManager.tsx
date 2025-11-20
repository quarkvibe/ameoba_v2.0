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

interface DataSource {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'database' | 'file' | 'astronomy' | 'webhook' | 'rss';
  config: {
    endpoint?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    body?: string;
    authentication?: {
      type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth';
      credentials?: Record<string, string>;
    };
    database?: {
      query: string;
      parameters?: Record<string, any>;
    };
    file?: {
      path: string;
      format: 'json' | 'csv' | 'xml' | 'txt';
    };
  };
  parsingRules: {
    dataPath: string;
    mappings: Record<string, string>;
    transformations?: Array<{
      field: string;
      operation: 'format_date' | 'lowercase' | 'uppercase' | 'extract_number' | 'custom';
      parameters?: any;
    }>;
  };
  schedule?: string;
  isActive: boolean;
  lastFetch?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  responseTime?: number;
  statusCode?: number;
}

export default function DataSourceManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTestingSource, setIsTestingSource] = useState(false);

  // Get data sources
  const { data: dataSources, isLoading } = useQuery<DataSource[]>({
    queryKey: ["/api/datasources"],
    refetchInterval: 30000,
  });

  // Mutations
  const createSourceMutation = useMutation({
    mutationFn: (source: Partial<DataSource>) => 
      apiRequest("POST", "/api/datasources", source),
    onSuccess: () => {
      toast({ title: "Success", description: "Data source created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/datasources"] });
      setIsDialogOpen(false);
      setEditingSource(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSourceMutation = useMutation({
    mutationFn: ({ id, ...source }: Partial<DataSource> & { id: string }) => 
      apiRequest("PUT", `/api/datasources/${id}`, source),
    onSuccess: () => {
      toast({ title: "Success", description: "Data source updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/datasources"] });
      setIsDialogOpen(false);
      setEditingSource(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/datasources/${id}`),
    onSuccess: () => {
      toast({ title: "Success", description: "Data source deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/datasources"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testSourceMutation = useMutation<TestResult, Error, Partial<DataSource>>({
    mutationFn: async (sourceConfig: Partial<DataSource>) => {
      const response = await apiRequest("POST", "/api/datasources/test", sourceConfig);
      return response as unknown as TestResult;
    },
    onSuccess: (result: TestResult) => {
      setTestResult(result);
      if (result.success) {
        toast({ title: "Test Successful", description: "Data source is working correctly." });
      } else {
        toast({ title: "Test Failed", description: result.error, variant: "destructive" });
      }
    },
    onError: (error) => {
      setTestResult({ success: false, error: error.message });
      toast({ title: "Test Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSourceSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const sourceData: Partial<DataSource> = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as DataSource['type'],
      config: {
        endpoint: formData.get('endpoint') as string,
        method: (formData.get('method') as DataSource['config']['method']) || 'GET',
        headers: {},
        authentication: {
          type: 'none'
        }
      },
      parsingRules: {
        dataPath: formData.get('dataPath') as string || '$',
        mappings: {}
      },
      isActive: formData.get('isActive') === 'on',
    };

    // Parse headers if provided
    const headersText = formData.get('headers') as string;
    if (headersText) {
      try {
        sourceData.config!.headers = JSON.parse(headersText);
      } catch (e) {
        toast({ title: "Invalid Headers", description: "Headers must be valid JSON", variant: "destructive" });
        return;
      }
    }

    if (editingSource) {
      updateSourceMutation.mutate({ id: editingSource.id, ...sourceData });
    } else {
      createSourceMutation.mutate(sourceData);
    }
  };

  const testDataSource = (source: DataSource) => {
    setIsTestingSource(true);
    testSourceMutation.mutate(source);
    setTimeout(() => setIsTestingSource(false), 2000);
  };

  const getStatusColor = (source: DataSource) => {
    if (!source.isActive) return 'bg-muted text-muted-foreground';
    if (source.lastError) return 'bg-destructive text-destructive-foreground';
    if (source.lastFetch) return 'bg-accent text-accent-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'api': return 'fas fa-globe';
      case 'database': return 'fas fa-database';
      case 'file': return 'fas fa-file';
      case 'astronomy': return 'fas fa-satellite';
      case 'webhook': return 'fas fa-webhook';
      case 'rss': return 'fas fa-rss';
      default: return 'fas fa-plug';
    }
  };

  if (isLoading) {
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-database text-primary"></i>
              Data Source Management
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-datasource">
                  <i className="fas fa-plus mr-2"></i>
                  Add Data Source
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>
                    {editingSource ? 'Edit' : 'Create'} Data Source
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                  <form onSubmit={handleSourceSubmit} className="space-y-6 p-1">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="connection">Connection</TabsTrigger>
                        <TabsTrigger value="parsing">Data Parsing</TabsTrigger>
                        <TabsTrigger value="test">Test & Validate</TabsTrigger>
                      </TabsList>

                      {/* Basic Information */}
                      <TabsContent value="basic" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Data Source Name</Label>
                            <Input
                              id="name"
                              name="name"
                              placeholder="e.g., Weather API"
                              defaultValue={editingSource?.name}
                              required
                              data-testid="input-source-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="type">Source Type</Label>
                            <Select name="type" defaultValue={editingSource?.type || 'api'}>
                              <SelectTrigger data-testid="select-source-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="api">External API</SelectItem>
                                <SelectItem value="database">Database Query</SelectItem>
                                <SelectItem value="file">File Source</SelectItem>
                                <SelectItem value="astronomy">Astronomy Engine</SelectItem>
                                <SelectItem value="webhook">Webhook</SelectItem>
                                <SelectItem value="rss">RSS Feed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            name="description"
                            placeholder="Describe what this data source provides"
                            defaultValue={editingSource?.description}
                            rows={3}
                            data-testid="textarea-source-description"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="isActive"
                            name="isActive"
                            defaultChecked={editingSource?.isActive ?? true}
                            data-testid="switch-source-active"
                          />
                          <Label htmlFor="isActive">Active</Label>
                        </div>
                      </TabsContent>

                      {/* Connection Configuration */}
                      <TabsContent value="connection" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="endpoint">Endpoint URL</Label>
                            <Input
                              id="endpoint"
                              name="endpoint"
                              placeholder="https://api.example.com/data"
                              defaultValue={editingSource?.config.endpoint}
                              data-testid="input-endpoint"
                            />
                          </div>
                          <div>
                            <Label htmlFor="method">HTTP Method</Label>
                            <Select name="method" defaultValue={editingSource?.config.method || 'GET'}>
                              <SelectTrigger data-testid="select-method">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="GET">GET</SelectItem>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="PUT">PUT</SelectItem>
                                <SelectItem value="DELETE">DELETE</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="headers">HTTP Headers (JSON)</Label>
                          <Textarea
                            id="headers"
                            name="headers"
                            placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                            defaultValue={editingSource?.config.headers ? JSON.stringify(editingSource.config.headers, null, 2) : ''}
                            rows={4}
                            data-testid="textarea-headers"
                          />
                        </div>

                        <div>
                          <Label htmlFor="authentication">Authentication</Label>
                          <Select name="authType" defaultValue="none">
                            <SelectTrigger data-testid="select-auth-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="api_key">API Key</SelectItem>
                              <SelectItem value="bearer">Bearer Token</SelectItem>
                              <SelectItem value="basic">Basic Auth</SelectItem>
                              <SelectItem value="oauth">OAuth 2.0</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>

                      {/* Data Parsing */}
                      <TabsContent value="parsing" className="space-y-4">
                        <div>
                          <Label htmlFor="dataPath">Data Path (JSONPath)</Label>
                          <Input
                            id="dataPath"
                            name="dataPath"
                            placeholder="$.data.items or $.response"
                            defaultValue={editingSource?.parsingRules.dataPath}
                            data-testid="input-data-path"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            JSONPath expression to extract the data you need
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="mappings">Field Mappings (JSON)</Label>
                          <Textarea
                            id="mappings"
                            name="mappings"
                            placeholder='{"title": "$.name", "content": "$.description", "date": "$.created_at"}'
                            defaultValue={editingSource?.parsingRules.mappings ? JSON.stringify(editingSource.parsingRules.mappings, null, 2) : ''}
                            rows={6}
                            data-testid="textarea-mappings"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Map source fields to standardized field names for AI consumption
                          </p>
                        </div>

                        <div>
                          <Label>Data Transformations</Label>
                          <div className="border rounded-lg p-4 space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Configure how the extracted data should be transformed before being passed to AI generation
                            </p>
                            <div className="text-center py-4 text-muted-foreground">
                              <i className="fas fa-wrench text-2xl mb-2"></i>
                              <p className="text-sm">Advanced transformations coming soon</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Test & Validate */}
                      <TabsContent value="test" className="space-y-4">
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            onClick={() => {
                              if (editingSource) {
                                testDataSource(editingSource);
                              }
                            }}
                            disabled={isTestingSource || !editingSource}
                            data-testid="button-test-source"
                          >
                            <i className={`fas ${isTestingSource ? 'fa-spinner fa-spin' : 'fa-play'} mr-2`}></i>
                            {isTestingSource ? 'Testing...' : 'Test Data Source'}
                          </Button>
                        </div>

                        {testResult && (
                          <Card className={`border ${testResult.success ? 'border-accent' : 'border-destructive'}`}>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-sm">
                                <i className={`fas ${testResult.success ? 'fa-check-circle text-accent' : 'fa-times-circle text-destructive'}`}></i>
                                Test {testResult.success ? 'Successful' : 'Failed'}
                                {testResult.responseTime && (
                                  <Badge variant="outline">{testResult.responseTime}ms</Badge>
                                )}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {testResult.success ? (
                                <div>
                                  <Label className="text-sm font-medium">Sample Data:</Label>
                                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                                    {JSON.stringify(testResult.data, null, 2)}
                                  </pre>
                                </div>
                              ) : (
                                <div>
                                  <Label className="text-sm font-medium text-destructive">Error:</Label>
                                  <p className="mt-1 text-sm text-destructive">{testResult.error}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-sm">
                            Testing validates the connection and shows a sample of the data that will be available for AI generation
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createSourceMutation.isPending || updateSourceMutation.isPending}
                        data-testid="button-save-source"
                      >
                        {createSourceMutation.isPending || updateSourceMutation.isPending ? 'Saving...' : 'Save Data Source'}
                      </Button>
                    </div>
                  </form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {dataSources?.map((source) => (
              <Card key={source.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <i className={`${getTypeIcon(source.type)} text-primary`}></i>
                        <h4 className="font-semibold">{source.name}</h4>
                        <Badge variant={source.isActive ? "default" : "secondary"}>
                          {source.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{source.type}</Badge>
                        <Badge className={getStatusColor(source)}>
                          {source.lastError ? 'Error' : source.lastFetch ? 'Connected' : 'Untested'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{source.description}</p>
                      <div className="text-xs text-muted-foreground">
                        <div>Endpoint: {source.config.endpoint || 'N/A'}</div>
                        <div>Data Path: {source.parsingRules.dataPath}</div>
                        {source.lastFetch && (
                          <div>Last Fetch: {new Date(source.lastFetch).toLocaleString()}</div>
                        )}
                        {source.lastError && (
                          <div className="text-destructive">Error: {source.lastError}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testDataSource(source)}
                        disabled={isTestingSource}
                        data-testid={`button-test-${source.id}`}
                      >
                        <i className="fas fa-play text-xs"></i>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSource(source);
                          setIsDialogOpen(true);
                        }}
                        data-testid={`button-edit-${source.id}`}
                      >
                        <i className="fas fa-edit text-xs"></i>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSourceMutation.mutate(source.id)}
                        disabled={deleteSourceMutation.isPending}
                        data-testid={`button-delete-${source.id}`}
                      >
                        <i className="fas fa-trash text-destructive text-xs"></i>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {(!dataSources || dataSources.length === 0) && (
              <div className="text-center py-12">
                <i className="fas fa-database text-muted-foreground text-4xl mb-4"></i>
                <p className="text-muted-foreground">No data sources configured</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add data sources to feed your AI content generation with external data
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}