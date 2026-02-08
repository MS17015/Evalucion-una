"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, GraduationCap } from "lucide-react";

interface StudentLoginProps {
  onLogin: (name: string) => void;
}

export function StudentLogin({ onLogin }: StudentLoginProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length >= 3) {
      onLogin(name.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2 text-primary">
            <GraduationCap size={48} />
          </div>
          <CardTitle className="text-3xl font-headline font-bold">UEES Evaluator</CardTitle>
          <CardDescription>
            Ingresa tu nombre completo para comenzar la evaluación de Prompt Engineering.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="student-name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Nombre del Estudiante
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="student-name"
                  placeholder="Ej. Juan Pérez"
                  className="pl-10 h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full h-11 text-base"
              disabled={name.trim().length < 3}
            >
              Comenzar Evaluación
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
