'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Upload, Send, Bot, User, FileText, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { chat, type ChatInput } from '@/ai/flows/chat';
import { Badge } from '@/components/ui/badge';


interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

// Helper function to read file as Data URI
const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to read file as Data URI'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'explain' | 'solve' | 'summarize'>('explain');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();

    React.useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedFile) return;

    const userMessageText = input;
    const userMessage: Message = { id: Date.now().toString(), text: userMessageText, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');
    const currentFile = selectedFile;
    setSelectedFile(null);

    try {
        let fileDataUri: string | undefined = undefined;
        if (currentFile) {
            fileDataUri = await fileToDataUri(currentFile);
        }

        const chatInput: ChatInput = {
            task: activeTab,
            message: userMessageText,
            fileDataUri: fileDataUri,
            language: language,
        };

        const result = await chat(chatInput);

        const botResponse: Message = { id: (Date.now() + 1).toString(), text: result.response, sender: 'bot' };
        setMessages(prev => [...prev, botResponse]);

    } catch(e: any) {
        console.error(e);
        const errorResponse: Message = { id: (Date.now() + 1).toString(), text: language === 'ar' ? 'عذراً، حدث خطأ أثناء معالجة طلبك.' : 'Sorry, an error occurred while processing your request.', sender: 'bot' };
        setMessages(prev => [...prev, errorResponse]);
        toast({
            variant: 'destructive',
            title: language === 'ar' ? 'حدث خطأ' : 'An Error Occurred',
            description: e.message || (language === 'ar' ? 'فشل الاتصال بمساعد الذكاء الاصطناعي.' : 'Failed to connect to the AI assistant.'),
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
            variant: 'destructive',
            title: 'الملف كبير جدًا',
            description: 'الرجاء اختيار ملف أصغر من 4 ميجابايت.',
        });
        return;
      }
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setSelectedFile(file);
        setInput(prev => prev ? `${prev} | ${file.name}` : file.name);
      } else {
        toast({
            variant: 'destructive',
            title: 'نوع ملف غير صالح',
            description: 'الرجاء اختيار ملف صورة أو PDF فقط.',
        });
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };


  return (
    <Card className="w-full h-full flex flex-col bg-transparent border-none shadow-none">
      <CardContent className="flex-grow flex flex-col gap-4 p-0">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/20 border border-white/10 p-1 h-auto">
                <TabsTrigger value="explain" className="py-2 data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground">شرح</TabsTrigger>
                <TabsTrigger value="solve" className="py-2 data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground">حل سؤال</TabsTrigger>
                <TabsTrigger value="summarize" className="py-2 data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground">تلخيص</TabsTrigger>
            </TabsList>
        </Tabs>
        
        <div className="space-y-2 pt-4">
            <Label className="text-sm font-medium text-center text-muted-foreground w-full block">لغة الرد</Label>
            <RadioGroup value={language} onValueChange={(v) => setLanguage(v as 'ar' | 'en')} className="flex justify-center gap-4">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="ar" id="lang-ar-ai" />
                    <Label htmlFor="lang-ar-ai">العربية</Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="en" id="lang-en-ai" />
                    <Label htmlFor="lang-en-ai">English</Label>
                </div>
            </RadioGroup>
        </div>

        <ScrollArea className="flex-grow h-[24rem] w-full bg-background/50 rounded-lg border border-white/10 p-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-16">
                <Sparkles className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold text-foreground">مساعدك الذكي</h3>
                <p className="text-sm">اطرح سؤالاً، أو ارفع ملف صورة أو PDF لتحليله.</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-start gap-3 w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                 {msg.sender === 'bot' && (
                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                        <AvatarFallback><Bot size={20} /></AvatarFallback>
                    </Avatar>
                 )}
                <div className={`rounded-lg px-4 py-3 max-w-[90%] md:max-w-[80%] ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-foreground'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
                 {msg.sender === 'user' && (
                    <Avatar className="h-8 w-8">
                        <AvatarFallback><User size={20} /></AvatarFallback>
                    </Avatar>
                 )}
              </div>
            ))}
             {isLoading && (
                <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                        <AvatarFallback><Bot size={20} /></AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg px-4 py-2 bg-muted/40">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="h-2 w-2 bg-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="h-2 w-2 bg-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="h-2 w-2 bg-foreground rounded-full animate-bounce"></div>
                        </div>
                    </div>
                </div>
             )}
          </div>
        </ScrollArea>
        
        <div className="relative">
          <Input
            type="text"
            placeholder="اسأل أو صف الملف..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isLoading && handleSendMessage()}
            disabled={isLoading}
            className="flex-grow h-12 pr-12 pl-4 bg-background/80 border-2 border-white/10 focus:border-primary"
          />
            <div className="absolute top-1/2 right-3 transform -translate-y-1/2 flex items-center gap-1">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={triggerFileUpload} disabled={isLoading}>
                    <Upload className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={handleSendMessage} disabled={isLoading || (!input.trim() && !selectedFile)}>
                    <Send className="h-5 w-5" />
                </Button>
            </div>
        </div>
        {selectedFile && (
            <Badge variant="secondary" className="flex items-center justify-between p-2 text-sm">
                <div className="flex items-center gap-2">
                    {selectedFile.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                    <span>{selectedFile.name}</span>
                </div>
                <button onClick={() => { setSelectedFile(null); setInput(input.split(' | ')[0] || ''); }} className="mr-auto text-destructive hover:text-destructive/80">&times;</button>
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
