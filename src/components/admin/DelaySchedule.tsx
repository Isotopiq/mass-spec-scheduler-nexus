import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon, Loader2, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { useOptimizedBooking } from "../../contexts/OptimizedBookingContext";
import { useAuth } from "../../contexts/AuthContext";
import { useScheduleDelays } from "../../hooks/useScheduleDelays";
import { useToast } from "../../hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const ALL_INSTRUMENTS = "all";

const formSchema = z.object({
  date: z.date({ required_error: "Date is required" }),
  startTime: z.string({ required_error: "Start time is required" }),
  delayMinutes: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Delay must be a positive number",
  }),
  instrumentId: z.string().default(ALL_INSTRUMENTS),
  reason: z.string().min(5, { message: "Reason must be at least 5 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

const DelaySchedule: React.FC = () => {
  const { bookings, instruments, refreshData } = useOptimizedBooking();
  const { user } = useAuth();
  const { delays, isLoading, isWorking, loadError, loadDelays, applyDelay, reverseDelay } = useScheduleDelays();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);

  useEffect(() => {
    loadDelays();
  }, [loadDelays]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      startTime: "09:00",
      delayMinutes: "30",
      instrumentId: ALL_INSTRUMENTS,
      reason: "",
    },
  });

  // Generate time options in 30-minute increments
  const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });

  const instrumentName = (id: string | null) =>
    id ? instruments.find((i) => i.id === id)?.name || "Unknown instrument" : "All instruments";

  const onInvalid = (errors: any) => {
    console.warn("DelaySchedule: form validation failed", errors);
    const firstMessage =
      (Object.values(errors)[0] as any)?.message || "Please complete all required fields.";
    toast({
      title: "Cannot apply delay",
      description: String(firstMessage),
      variant: "destructive",
    });
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      const delayMin = Number(values.delayMinutes);
      const [hours, minutes] = values.startTime.split(":").map(Number);
      const cutoff = new Date(values.date);
      cutoff.setHours(hours, minutes, 0, 0);

      const result = await applyDelay({
        delayMinutes: delayMin,
        cutoff,
        instrumentId: values.instrumentId === ALL_INSTRUMENTS ? null : values.instrumentId,
        reason: values.reason,
        appliedBy: user?.id || null,
        appliedByName: user?.name || null,
      });

      await refreshData();

      if (result.affected === 0) {
        toast({
          title: "No bookings to delay",
          description: `No active bookings start after ${format(cutoff, "PPpp")}.`,
        });
      } else {
        toast({
          title: "Delay applied",
          description: `${result.affected} booking(s) pushed back by ${delayMin} minutes and notified by email.${
            result.skipped ? ` ${result.skipped} could not be moved.` : ""
          }`,
        });
      }

      form.reset({
        date: new Date(),
        startTime: "09:00",
        delayMinutes: "30",
        instrumentId: ALL_INSTRUMENTS,
        reason: "",
      });
    } catch (error: any) {
      console.error("Failed to apply delay", error);
      toast({
        title: "Failed to apply delay",
        description: error?.message || "An error occurred while applying the delay.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleReverse = async (delayId: string) => {
    try {
      setReversingId(delayId);
      const result = await reverseDelay(delayId);
      await refreshData();
      toast({
        title: "Delay reversed",
        description: `${result.restored ?? 0} booking(s) restored to their original times.${
          result.skipped ? ` ${result.skipped} skipped (deleted or rescheduled since).` : ""
        }`,
      });
    } catch (error: unknown) {
      console.error("Failed to reverse delay", error);
      toast({
        title: "Failed to reverse delay",
        description: error instanceof Error ? error.message : "An error occurred while reversing the delay.",
        variant: "destructive",
      });
    } finally {
      setReversingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Delay Management</CardTitle>
          <CardDescription>
            Push back all active bookings after a specific time. Affected users are emailed their new
            start time automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant={"outline"}

                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>All bookings after this time will be delayed</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="delayMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delay Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="30" {...field} />
                      </FormControl>
                      <FormDescription>How long the schedules should be delayed</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instrumentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instrument</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All instruments" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ALL_INSTRUMENTS}>All instruments</SelectItem>
                          {instruments.map((instrument) => (
                            <SelectItem key={instrument.id} value={instrument.id}>
                              {instrument.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Optionally limit the delay to a single instrument
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Delay</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Explain why the delay is necessary" {...field} />
                    </FormControl>
                    <FormDescription>Included in the email sent to affected users</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || isWorking}>
                  {isSubmitting ? "Applying Delay..." : "Apply Delay"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delay History</CardTitle>
          <CardDescription>
            Reverse a delay to restore each booking to its original time and notify the users again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Delay history could not be loaded: {loadError}
            </div>
          ) : isLoading && delays.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading delay history...
            </div>
          ) : delays.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No delays have been applied yet.</p>
          ) : (
            <div className="space-y-3">
              {delays.map((delay) => (
                <div
                  key={delay.id}
                  className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">+{delay.delayMinutes} min</span>
                      <Badge variant={delay.status === "reversed" ? "outline" : "secondary"}>
                        {delay.status === "reversed" ? "Reversed" : "Applied"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {delay.affectedCount} booking(s)
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      From {format(new Date(delay.cutoffTime), "PPp")} ·{" "}
                      {instrumentName(delay.instrumentId)}
                    </p>
                    {delay.reason ? (
                      <p className="break-words text-sm">Reason: {delay.reason}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Applied {format(new Date(delay.createdAt), "PPp")}
                      {delay.appliedByName ? ` by ${delay.appliedByName}` : ""}
                      {delay.reversedAt
                        ? ` · Reversed ${format(new Date(delay.reversedAt), "PPp")}`
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {delay.status === "applied" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReverse(delay.id)}
                        disabled={isWorking || reversingId === delay.id}
                      >
                        {reversingId === delay.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Undo2 className="mr-2 h-4 w-4" />
                        )}
                        Reverse
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DelaySchedule;
