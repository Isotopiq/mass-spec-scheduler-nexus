import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const LoginForm: React.FC = () => {
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingAuth, setPendingAuth] = useState<{ tempToken: string; email: string; rememberMe: boolean } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const reset2FA = () => {
    setNeeds2FA(false);
    setOtp("");
    setPendingAuth(null);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      console.log("Attempting login with:", values.email);
      const result = await login(values.email, values.password, values.rememberMe);
      console.log("Login result:", result);

      if (result?.needs2FA && result.tempToken) {
        setNeeds2FA(true);
        setPendingAuth({ tempToken: result.tempToken, email: values.email, rememberMe: values.rememberMe });
        setIsLoading(false);
        return;
      }

      toast.success("Login successful! Welcome back to the Mass Spec Lab");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 500);
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error instanceof Error ? error.message : "Please check your credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAuth || otp.length !== 6) return;
    try {
      setIsLoading(true);
      await verify2FA(pendingAuth.tempToken, otp, pendingAuth.email, pendingAuth.rememberMe);
      toast.success("Login successful! Welcome back to the Mass Spec Lab");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 500);
    } catch (error) {
      console.error("2FA verification error:", error);
      toast.error(error instanceof Error ? error.message : "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  if (needs2FA) {
    return (
      <form onSubmit={handleVerify2FA} className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Two-factor authentication</h3>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>
        <div className="flex justify-center py-2">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => setOtp(value)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={reset2FA} disabled={isLoading}>
            Cancel
          </Button>
          <Button className="flex-1" type="submit" disabled={isLoading || otp.length !== 6}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="your.email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal cursor-pointer">Remember me for 30 days</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Logging in...
            </>
          ) : "Login"}
        </Button>
      </form>
    </Form>
  );
};

export default LoginForm;
