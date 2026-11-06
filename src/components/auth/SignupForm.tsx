
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

const SignupForm: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      console.log("Attempting signup with:", values.email);
      
      await signup(values.email, values.password, values.name);
      
      console.log("Signup successful");
      toast.success("Account created successfully! Please check your email for verification.");
      
      // Navigate after a short delay
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 500);
    } catch (error) {
      console.error("Signup error:", error);
      
      let errorMessage = "Failed to create account. ";
      if (error instanceof Error) {
        if (error.message.includes('User already registered')) {
          errorMessage = "An account with this email already exists.";
        } else if (error.message.includes('Invalid email')) {
          errorMessage = "Please provide a valid email address.";
        } else {
          errorMessage += error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your.email@example.com" {...field} />
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
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Creating Account...
            </>
          ) : "Create Account"}
        </Button>
      </form>
    </Form>
  );
};

export default SignupForm;
