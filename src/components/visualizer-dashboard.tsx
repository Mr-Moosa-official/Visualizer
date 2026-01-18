"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, Zap, CheckCircle, XCircle, History, KeyRound } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const limitSchema = z.object({
  minute: z.coerce.number().int().min(1, "Must be at least 1"),
  hour: z.coerce.number().int().min(1, "Must be at least 1"),
  day: z.coerce.number().int().min(1, "Must be at least 1"),
});

type LimitFormValues = z.infer<typeof limitSchema>;
type RequestLog = { id: number; timestamp: Date; status: 'allowed' | 'blocked' };

export default function VisualizerDashboard() {
  const { toast } = useToast();
  const [limits, setLimits] = useState({ minute: 60, hour: 1000, day: 5000 });
  const [requests, setRequests] = useState<Date[]>([]);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [allowedCount, setAllowedCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [, setTick] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const VALID_API_KEY = 'fs-studio-demo-key';

  const form = useForm<LimitFormValues>({
    resolver: zodResolver(limitSchema),
    defaultValues: limits,
    mode: "onChange",
  });

  const onSubmit = (data: LimitFormValues) => {
    setLimits(data);
    setRequests([]);
    setLogs([]);
    setAllowedCount(0);
    setBlockedCount(0);
    toast({
      title: "Settings Applied",
      description: "Rate limits have been updated.",
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
      const now = new Date();
      setRequests(currentRequests => currentRequests.filter(req => now.getTime() - req.getTime() < 86400000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateRequest = useCallback(() => {
    const now = new Date();
    
    const requestsInLastMinute = requests.filter(r => now.getTime() - r.getTime() < 60000);
    const requestsInLastHour = requests.filter(r => now.getTime() - r.getTime() < 3600000);
    const requestsInLastDay = requests.filter(r => now.getTime() - r.getTime() < 86400000);

    let isBlocked = false;
    if (requestsInLastMinute.length >= limits.minute || requestsInLastHour.length >= limits.hour || requestsInLastDay.length >= limits.day) {
      isBlocked = true;
    }

    const newLog: RequestLog = { id: Date.now(), timestamp: now, status: isBlocked ? 'blocked' : 'allowed' };
    setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 10));

    if (isBlocked) {
      setBlockedCount(c => c + 1);
    } else {
      setAllowedCount(c => c + 1);
      setRequests(r => [...r, now]);
    }
  }, [requests, limits]);

  const handleTestApiKey = useCallback(() => {
    if (apiKey === VALID_API_KEY) {
      setApiKeyStatus('valid');
      toast({
        title: 'API Key Valid',
        description: 'This is a valid API key.',
      });
    } else {
      setApiKeyStatus('invalid');
      toast({
        variant: 'destructive',
        title: 'API Key Invalid',
        description: 'This is not a valid API key.',
      });
    }
  }, [apiKey, toast]);

  const requestsInLastMinute = useMemo(() => {
    const now = new Date();
    return requests.filter(r => now.getTime() - r.getTime() < 60000);
  }, [requests, setTick]);

  const usagePercentage = useMemo(() => {
    if (limits.minute === 0) return 0;
    return (requestsInLastMinute.length / limits.minute) * 100;
  }, [requestsInLastMinute, limits.minute]);

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="lg:col-span-1 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <CardTitle>Configuration</CardTitle>
          </div>
          <CardDescription>Set the rate limits for the simulation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control} name="minute"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requests / minute</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control} name="hour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requests / hour</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control} name="day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requests / day</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Apply Settings</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="lg:col-span-2 space-y-8">
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-primary" />
              <CardTitle>Simulation & Monitoring</CardTitle>
            </div>
            <CardDescription>Simulate requests and see the rate limiter in action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button onClick={handleSimulateRequest} className="w-full" size="lg">Simulate API Request</Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Allowed Requests</p>
                <p className="text-4xl font-bold text-primary">{allowedCount}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Blocked Requests</p>
                <p className="text-4xl font-bold text-destructive">{blockedCount}</p>
              </div>
            </div>
            <Separator />
            <div>
              <Label className="text-sm text-muted-foreground">Current Minute Usage</Label>
              <div className="mt-2">
                <div className="w-full bg-muted rounded-full h-6 dark:bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ease-in-out flex items-center justify-end px-2 text-xs font-bold ${
                      usagePercentage > 80 ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  >
                    {usagePercentage > 10 && `${Math.round(usagePercentage)}%`}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-right mt-1">{requestsInLastMinute.length} / {limits.minute} requests</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <KeyRound className="w-6 h-6 text-primary" />
              <CardTitle>API Key Tester</CardTitle>
            </div>
            <CardDescription>
              Simulate validating an API key. Use `fs-studio-demo-key` to test.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter API Key"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (apiKeyStatus !== 'idle') {
                    setApiKeyStatus('idle');
                  }
                }}
              />
              <Button onClick={handleTestApiKey}>Test Key</Button>
            </div>
            {apiKeyStatus !== 'idle' && (
              <div
                className={`flex items-center gap-2 p-3 rounded-md animate-fade-in ${
                  apiKeyStatus === 'valid' ? 'bg-primary/10' : 'bg-destructive/10'
                }`}
              >
                {apiKeyStatus === 'valid' ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
                <p
                  className={`text-sm font-medium ${
                    apiKeyStatus === 'valid' ? 'text-primary' : 'text-destructive'
                  }`}
                >
                  {apiKeyStatus === 'valid'
                    ? 'API Key is Valid'
                    : 'API Key is Invalid'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-primary" />
              <CardTitle>Request Log</CardTitle>
            </div>
            <CardDescription>A log of the last 10 simulated requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 h-80 overflow-y-auto pr-2">
              {logs.length === 0 ? (
                <li className="text-sm text-muted-foreground text-center py-10">No requests simulated yet.</li>
              ) : (
                logs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between bg-muted/30 p-3 rounded-md animate-fade-in">
                    <div className="flex items-center gap-3">
                      {log.status === 'allowed' ? <CheckCircle className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                      <p className="text-sm font-mono">{format(log.timestamp, 'HH:mm:ss.SSS')}</p>
                    </div>
                    <Badge variant={log.status === 'blocked' ? 'destructive' : 'default'}>{log.status}</Badge>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
