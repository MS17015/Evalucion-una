"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { extractAndValidateFeedback, type ExtractAndValidateFeedbackOutput } from "@/ai/flows/extract-and-validate-feedback";
import { 
  Upload, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Code, 
  FileText, 
  History as HistoryIcon, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  FileJson,
  Target,
  RefreshCcw,
  PlusCircle,
  Eraser
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface EvaluationRecord {
  id: string;
  timestamp: number;
  systemInstruction: string;
  score: number;
  total: number;
  results: ExtractAndValidateFeedbackOutput;
}

interface PromptEvaluationDashboardProps {
  studentName: string;
  onLogout: () => void;
}

export function PromptEvaluationDashboard({ studentName, onLogout }: PromptEvaluationDashboardProps) {
  const [systemInstruction, setSystemInstruction] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExtractAndValidateFeedbackOutput | null>(null);
  const [history, setHistory] = useState<EvaluationRecord[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHistory = localStorage.getItem(`uees_history_${studentName}`);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    }
  }, [studentName]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const startNewAttempt = () => {
    // Hard reset of all states to ensure no instructions are reused
    setCurrentResult(null);
    setSystemInstruction("");
    setFileContent(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runEvaluation = async () => {
    if (!systemInstruction.trim() || !fileContent) return;
    
    // Clear previous result immediately
    setCurrentResult(null);
    setIsProcessing(true);

    try {
      const output = await extractAndValidateFeedback({
        systemInstruction: systemInstruction.trim(),
        textContent: fileContent,
      });

      setCurrentResult(output);
      
      const score = output.validatedResults.filter(r => r.validationStatus === "Success").length;
      const total = output.validatedResults.length;

      const record: EvaluationRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        systemInstruction: systemInstruction.trim(),
        score,
        total,
        results: output,
      };

      const newHistory = [record, ...history];
      setHistory(newHistory);
      localStorage.setItem(`uees_history_${studentName}`, JSON.stringify(newHistory));
    } catch (error) {
      console.error("Evaluation failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const score = currentResult 
    ? currentResult.validatedResults.filter(r => r.validationStatus === "Success").length 
    : 0;
  const totalItems = currentResult ? currentResult.validatedResults.length : 0;
  const percentage = totalItems > 0 ? (score / totalItems) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-full text-primary">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-headline">Panel de Evaluación</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="font-semibold text-foreground">{studentName}</span>
              <span className="text-xs px-2 py-0.5 bg-secondary rounded-full uppercase tracking-wider font-bold">UEES Student</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter flex items-center gap-1">
              <Target size={10} /> Intentos Realizados
            </span>
            <span className="text-lg font-bold text-primary leading-none">
              {history.length}
            </span>
          </div>
          <Button variant="outline" onClick={onLogout} className="flex items-center gap-2 h-11">
            <LogOut size={16} /> Salir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-md border-t-4 border-t-primary overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-muted/30">
              <div>
                <CardTitle className="flex items-center gap-2 text-primary text-lg">
                  <Code size={20} /> 1. System Instruction
                </CardTitle>
                <CardDescription>Define el comportamiento de la IA.</CardDescription>
              </div>
              {!currentResult && !isProcessing && (
                <Button variant="ghost" size="icon" onClick={() => setSystemInstruction("")} title="Limpiar instrucción">
                  <Eraser size={18} />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Textarea 
                placeholder="Escribe tu instrucción aquí... El agente seguirá estrictamente tus reglas."
                className="min-h-[220px] font-code text-sm border-2 focus-visible:ring-primary leading-relaxed"
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                disabled={currentResult !== null || isProcessing}
              />
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <p className="text-[11px] text-amber-700 leading-tight">
                  <strong className="block mb-1">Nota de Evaluación:</strong>
                  El agente NO conoce las reglas de extracción por defecto. Tu instrucción debe definir explícitamente qué extraer y cómo clasificarlo.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary text-lg">
                <Upload size={20} /> 2. Casos de Prueba
              </CardTitle>
              <CardDescription>Archivo .txt con ejemplos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer hover:bg-muted/50 group ${(fileName || currentResult) ? 'border-accent bg-accent/5' : 'border-muted-foreground/20'} ${(currentResult || isProcessing) ? 'pointer-events-none opacity-60' : ''}`}
                onClick={() => !currentResult && !isProcessing && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".txt" 
                  onChange={handleFileUpload} 
                />
                {fileName ? (
                  <div className="space-y-2">
                    <FileText className="mx-auto text-accent" size={32} />
                    <p className="font-bold text-xs truncate max-w-[150px] mx-auto">{fileName}</p>
                    <Badge variant="secondary" className="text-[10px]">Cargado</Badge>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto text-muted-foreground group-hover:scale-110 transition-transform" size={32} />
                    <p className="text-xs font-bold uppercase tracking-tight">Seleccionar .txt</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {currentResult === null ? (
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-14 text-lg shadow-lg group"
                    disabled={!systemInstruction.trim() || !fileContent || isProcessing}
                    onClick={runEvaluation}
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <RefreshCcw className="animate-spin" size={20} /> Evaluando...
                      </span>
                    ) : (
                      <>
                        Ejecutar Evaluación
                        <Play className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-white font-black h-14 text-lg shadow-lg animate-in zoom-in-90"
                    onClick={startNewAttempt}
                  >
                    <PlusCircle className="mr-2" size={20} />
                    NUEVO INTENTO
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2 space-y-6">
          {!currentResult && !isProcessing ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] border-2 border-dashed rounded-3xl bg-white/40 text-muted-foreground backdrop-blur-sm">
              <div className="bg-muted/30 p-8 rounded-full mb-6">
                <AlertTriangle size={64} className="opacity-10" />
              </div>
              <p className="text-xl font-medium">Esperando configuración...</p>
              <p className="text-sm opacity-60 text-center max-w-[300px]">Define tu instrucción de sistema y carga los datos para comenzar la prueba.</p>
            </div>
          ) : isProcessing ? (
            <Card className="shadow-xl h-full min-h-[500px] flex items-center justify-center border-none bg-white/80 backdrop-blur-md">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-primary/20 rounded-full mx-auto"></div>
                  <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto absolute inset-0"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-primary animate-pulse">Llamando al Agente</h3>
                  <p className="text-muted-foreground text-sm">El modelo está aplicando tu instrucción a los datos en tiempo real...</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              {/* Score Summary */}
              <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white shadow-2xl overflow-hidden border-none">
                <CardContent className="pt-8 pb-8 relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Target size={120} />
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="space-y-1">
                      <p className="text-primary-foreground/70 font-bold uppercase tracking-widest text-xs">Calificación del Prompt</p>
                      <div className="flex items-baseline gap-3">
                        <span className="text-7xl font-black">{score}</span>
                        <span className="text-3xl text-primary-foreground/40 font-bold">/ {totalItems}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-3">
                      <div className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-lg shadow-inner ${percentage === 100 ? 'bg-accent text-accent-foreground' : 'bg-white/20'}`}>
                        {score === totalItems ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                        {percentage.toFixed(0)}% Éxito
                      </div>
                      <p className="text-xs font-medium text-primary-foreground/60 italic">Respuesta analizada</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span>Precisión de la Extracción</span>
                      <span>{score} exitosos de {totalItems}</span>
                    </div>
                    <Progress value={percentage} className="h-4 bg-white/10" />
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Tabs */}
              <Tabs defaultValue="formatted" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-14 bg-white/50 backdrop-blur border-2 mb-6 p-1 rounded-xl">
                  <TabsTrigger value="formatted" className="text-sm font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all">
                    Resultados por Caso
                  </TabsTrigger>
                  <TabsTrigger value="raw" className="text-sm font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all">
                    Payload JSON (Raw)
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="formatted" className="space-y-4">
                  {currentResult?.validatedResults.map((result, idx) => (
                    <Card key={idx} className={`shadow-md border-l-8 transition-all hover:scale-[1.01] ${result.validationStatus === 'Success' ? 'border-l-accent bg-accent/5' : 'border-l-destructive bg-destructive/5'}`}>
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="px-3 py-1 font-black text-[10px]">LÍNEA {idx + 1}</Badge>
                              {result.validationStatus === 'Success' ? (
                                <Badge className="bg-accent text-accent-foreground font-black border-none gap-1">
                                  <CheckCircle2 size={12} /> CUMPLE SCHEMA
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="font-black gap-1">
                                  <XCircle size={12} /> ERROR LÓGICO/FORMATO
                                </Badge>
                              )}
                            </div>
                            <div className="bg-white/60 p-4 rounded-xl border border-black/5">
                              <p className="text-sm text-foreground/80 italic leading-relaxed">
                                "{result.originalText}"
                              </p>
                            </div>
                          </div>
                        </div>

                        {result.parsedResult ? (
                          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-white p-3 rounded-xl border shadow-sm">
                              <label className="text-[9px] text-muted-foreground block uppercase font-black mb-1">Entidad</label>
                              <span className="text-xs font-bold text-primary truncate block">{result.parsedResult.entidad || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border shadow-sm">
                              <label className="text-[9px] text-muted-foreground block uppercase font-black mb-1">Polaridad</label>
                              <Badge className={`text-[10px] font-black ${result.parsedResult.polaridad === 'Amor' ? 'bg-accent/20 text-accent hover:bg-accent/30' : 'bg-red-100 text-red-600 hover:bg-red-200'} border-none`}>
                                {result.parsedResult.polaridad.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="bg-white p-3 rounded-xl border shadow-sm">
                              <label className="text-[9px] text-muted-foreground block uppercase font-black mb-1">Urgencia</label>
                              <span className={`text-xs font-black ${result.parsedResult.urgencia ? 'text-red-500' : 'text-slate-400'}`}>
                                {result.parsedResult.urgencia ? 'SÍ (CRÍTICO)' : 'NO'}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border shadow-sm">
                              <label className="text-[9px] text-muted-foreground block uppercase font-black mb-1">Categoría</label>
                              <div className="flex flex-wrap gap-1">
                                {result.parsedResult.categoria.length > 0 ? (
                                  result.parsedResult.categoria.map((cat, i) => (
                                    <Badge key={i} variant="outline" className="text-[9px] px-2 py-0 font-bold border-primary/20">{cat}</Badge>
                                  ))
                                ) : (
                                  <span className="text-[9px] text-muted-foreground">Ninguna</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                            <p className="text-xs text-destructive font-medium flex items-center gap-2">
                              <AlertTriangle size={14} /> El modelo no pudo extraer datos válidos basándose en tu instrucción.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="raw">
                  <Card className="bg-slate-950 border-none shadow-2xl rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-900/50 flex flex-row items-center justify-between py-4 px-6 border-b border-white/5">
                      <CardTitle className="text-white flex items-center gap-3 text-sm font-bold">
                        <FileJson size={18} className="text-accent" /> 
                        <span className="tracking-widest uppercase">Respuesta del Agente</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="bg-black/40 p-4 rounded-xl overflow-x-auto max-h-[500px] scrollbar-thin scrollbar-thumb-white/10">
                        <pre className="text-emerald-400 font-code text-xs leading-relaxed whitespace-pre-wrap">
                          {currentResult ? currentResult.rawResponse : '// No hay respuesta para mostrar'}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      <Card className="shadow-xl border-none bg-white/60 backdrop-blur-sm overflow-hidden rounded-3xl">
        <CardHeader className="bg-white/40 border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <HistoryIcon size={24} />
            </div>
            Historial de Evaluaciones
          </CardTitle>
          <CardDescription>Registro de experimentos realizados.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {history.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed">
              <Target size={48} className="mx-auto mb-4 opacity-10" />
              <p className="font-medium">No hay evaluaciones previas.</p>
              <p className="text-xs">Tus intentos aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-5 bg-white border rounded-2xl hover:border-primary transition-all hover:shadow-lg group cursor-pointer" 
                  onClick={() => {
                    setCurrentResult(record.results);
                    setSystemInstruction(record.systemInstruction);
                  }}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg ${record.score === record.total ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'}`}>
                      {record.score}/{record.total}
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase tracking-tight">Evaluación Finalizada</p>
                      <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                        <Target size={10} /> {new Date(record.timestamp).toLocaleString('es-SV')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Vista Previa Prompt</p>
                      <p className="text-[11px] truncate max-w-[250px] font-medium text-slate-500">"{record.systemInstruction}"</p>
                    </div>
                    <Button variant="secondary" size="icon" className="rounded-full group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                      <ChevronRight size={20} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <footer className="text-center py-12 space-y-3">
        <div className="w-16 h-1 bg-primary/20 mx-auto rounded-full mb-6"></div>
        <p className="text-xs font-black text-primary/40 uppercase tracking-[0.3em]">Universidad Evangélica de El Salvador</p>
        <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/60">Prompt Engineering Lab • Facultad de Informática</p>
      </footer>
    </div>
  );
}
