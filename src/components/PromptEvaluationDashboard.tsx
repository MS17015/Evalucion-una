"use client";

import { useState, useRef } from "react";
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
  Target
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface PromptEvaluationDashboardProps {
  studentName: string;
  onLogout: () => void;
}

interface EvaluationRecord {
  id: string;
  timestamp: number;
  systemInstruction: string;
  score: number;
  total: number;
  results: ExtractAndValidateFeedbackOutput;
}

export function PromptEvaluationDashboard({ studentName, onLogout }: PromptEvaluationDashboardProps) {
  const [systemInstruction, setSystemInstruction] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExtractAndValidateFeedbackOutput | null>(null);
  const [history, setHistory] = useState<EvaluationRecord[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useState(() => {
    if (typeof window !== "undefined") {
      const savedHistory = localStorage.getItem(`uees_history_${studentName}`);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    }
  });

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

  const runEvaluation = async () => {
    if (!systemInstruction || !fileContent) return;
    
    setIsProcessing(true);
    try {
      const output = await extractAndValidateFeedback({
        systemInstruction,
        textContent: fileContent,
      });

      setCurrentResult(output);
      
      const score = output.validatedResults.filter(r => r.validationStatus === "Success").length;
      const total = output.validatedResults.length;

      const record: EvaluationRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        systemInstruction,
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
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Code size={20} /> 1. System Instruction
              </CardTitle>
              <CardDescription>Define cómo debe comportarse el agente de IA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="Ingresa la instrucción de sistema aquí..."
                className="min-h-[200px] font-code text-sm border-2 focus-visible:ring-primary"
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
              />
              <p className="text-xs text-muted-foreground italic">
                * El agente debe extraer: entidad, polaridad (Amor/Odio), categoría y urgencia.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Upload size={20} /> 2. Carga de Datos (.txt)
              </CardTitle>
              <CardDescription>Sube el archivo con los casos de prueba.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:bg-muted/50 ${fileName ? 'border-accent bg-accent/5' : 'border-muted-foreground/20'}`}
                onClick={() => fileInputRef.current?.click()}
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
                    <FileText className="mx-auto text-accent" size={40} />
                    <p className="font-medium text-sm truncate">{fileName}</p>
                    <Button variant="ghost" size="sm" className="text-xs">Cambiar archivo</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto text-muted-foreground" size={40} />
                    <p className="text-sm font-medium">Click para subir archivo .txt</p>
                    <p className="text-xs text-muted-foreground">O arrastra y suelta aquí</p>
                  </div>
                )}
              </div>
              
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12"
                disabled={!systemInstruction || !fileContent || isProcessing}
                onClick={runEvaluation}
              >
                {isProcessing ? "Procesando con IA..." : "3. Iniciar Evaluación"}
                {!isProcessing && <Play className="ml-2" size={18} />}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2 space-y-6">
          {!currentResult && !isProcessing ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] border-2 border-dashed rounded-2xl bg-white/50 text-muted-foreground">
              <AlertTriangle size={48} className="mb-4 opacity-20" />
              <p className="text-lg">Configura el prompt y sube un archivo para ver los resultados.</p>
            </div>
          ) : isProcessing ? (
            <Card className="animate-pulse shadow-md h-full min-h-[400px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-primary font-bold">El agente está analizando los datos...</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              {/* Score Summary */}
              <Card className="bg-gradient-to-r from-primary to-primary/80 text-white shadow-xl overflow-hidden relative">
                <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 -skew-x-12 transform translate-x-12" />
                <CardContent className="pt-6 pb-6 relative">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white/80">Calificación Obtenida</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold">{score}</span>
                        <span className="text-2xl text-white/60">/ {totalItems} pts</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-2">
                        {score === totalItems ? <CheckCircle2 size={20} className="text-accent" /> : <AlertTriangle size={20} className="text-yellow-400" />}
                        <span className="font-bold">{percentage.toFixed(0)}% Éxito</span>
                      </div>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-3 bg-white/20" />
                </CardContent>
              </Card>

              {/* Detailed Tabs */}
              <Tabs defaultValue="formatted" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 bg-white border mb-4">
                  <TabsTrigger value="formatted" className="text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                    Vista de Evaluación
                  </TabsTrigger>
                  <TabsTrigger value="raw" className="text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                    Respuesta Cruda (JSON)
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="formatted" className="space-y-4">
                  {currentResult?.validatedResults.map((result, idx) => (
                    <Card key={idx} className={`shadow-sm border-l-4 transition-all hover:shadow-md ${result.validationStatus === 'Success' ? 'border-l-accent' : 'border-l-destructive'}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Caso {idx + 1}</Badge>
                              {result.validationStatus === 'Success' ? (
                                <span className="flex items-center gap-1 text-accent text-xs font-bold">
                                  <CheckCircle2 size={12} /> EXITOSA
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-destructive text-xs font-bold">
                                  <XCircle size={12} /> FALLO EN FORMATO
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground italic bg-muted/30 p-2 rounded leading-relaxed">
                              "{result.originalText}"
                            </p>
                          </div>
                        </div>

                        {result.parsedResult && (
                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="bg-secondary/30 p-2 rounded">
                              <label className="text-[10px] text-muted-foreground block uppercase font-bold">Entidad</label>
                              <span className="text-sm font-medium">{result.parsedResult.entidad}</span>
                            </div>
                            <div className="bg-secondary/30 p-2 rounded">
                              <label className="text-[10px] text-muted-foreground block uppercase font-bold">Polaridad</label>
                              <Badge className={result.parsedResult.polaridad === 'Amor' ? 'bg-accent text-white' : 'bg-red-400 text-white'}>
                                {result.parsedResult.polaridad}
                              </Badge>
                            </div>
                            <div className="bg-secondary/30 p-2 rounded">
                              <label className="text-[10px] text-muted-foreground block uppercase font-bold">Urgencia</label>
                              <span className="text-sm font-medium">{result.parsedResult.urgencia ? 'Sí' : 'No'}</span>
                            </div>
                            <div className="bg-secondary/30 p-2 rounded">
                              <label className="text-[10px] text-muted-foreground block uppercase font-bold">Categoría</label>
                              <div className="flex flex-wrap gap-1">
                                {result.parsedResult.categoria.map((cat, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">{cat}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="raw">
                  <Card className="bg-slate-900 border-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/10">
                      <CardTitle className="text-white flex items-center gap-2 text-base">
                        <FileJson size={18} /> JSON Agent Output
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 overflow-x-auto">
                      <pre className="text-green-400 font-code text-xs leading-relaxed">
                        {currentResult ? currentResult.rawResponse : '// No response available'}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      <Card className="shadow-lg border-t-4 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon size={20} className="text-primary" /> Historial de Evaluaciones
          </CardTitle>
          <CardDescription>Tus intentos anteriores quedan registrados aquí.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl">
              No hay evaluaciones previas registradas.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-white border rounded-xl hover:border-primary/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${record.score === record.total ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                      {record.score === record.total ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">Puntuación: {record.score} / {record.total}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.timestamp).toLocaleString('es-SV')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Prompt Preview</p>
                      <p className="text-xs truncate max-w-[200px] italic">"{record.systemInstruction.substring(0, 40)}..."</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentResult(record.results)} className="group-hover:text-primary">
                      <ChevronRight size={20} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Footer Branding */}
      <footer className="text-center py-8 opacity-50 space-y-2">
        <p className="text-sm font-bold">Universidad Evangélica de El Salvador (UEES)</p>
        <p className="text-[10px] uppercase tracking-widest font-bold">Prompt Engineering Lab • Facultad de Informática</p>
      </footer>
    </div>
  );
}
