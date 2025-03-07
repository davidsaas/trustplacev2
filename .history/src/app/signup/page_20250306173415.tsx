"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { signUp, signInWithGoogle, loading, error } = useAuth();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await signUp(email, password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-blue-100/30 rounded-full blur-3xl -z-10 transform -translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-brand/10 rounded-full blur-3xl -z-10 transform translate-x-1/3 translate-y-1/3"></div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold text-center mt-4">Create an account</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <Button 
              onClick={signInWithGoogle} 
              disabled={loading}
              className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700"
              variant="outline"
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your.email@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">Password must be at least 6 characters</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-800 font-semibold">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 