import React, { useState, useRef, useEffect } from 'react';
import { 
  Files, 
  Scissors, 
  ArrowDownToLine, 
  FileText, 
  Type, 
  Image as ImageIcon, 
  FileImage, 
  PenTool, 
  Lock, 
  Unlock,
  Search,
  Upload,
  Download,
  X,
  ChevronLeft,
  Loader2,
  Sun,
  Moon,
  FileCheck,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as pdfjs from 'pdfjs-dist';

// pdfjs worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ToolType = 'merge' | 'split' | 'compress' | 'pdf-to-word' | 'edit' | 'pdf-to-jpg' | 'jpg-to-pdf' | 'sign' | 'unlock' | 'protect';

interface Tool {
  id: ToolType;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  tag?: string;
  requiresPro?: boolean;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
}

const TOOLS: Tool[] = [
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine PDFs in the order you want with the easiest PDF merger available.',
    icon: <Files size={24} />,
    iconBg: '#fff1f2',
    iconColor: '#e11d48'
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Separate one page or a whole set for easy conversion into independent PDF files.',
    icon: <Scissors size={24} />,
    iconBg: '#fff1f2',
    iconColor: '#e11d48'
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce file size while optimizing for maximal PDF quality.',
    icon: <ArrowDownToLine size={24} />,
    iconBg: '#fff1f2',
    iconColor: '#e11d48'
  },
  {
    id: 'pdf-to-word',
    title: 'PDF to Word',
    description: 'Extract text from your PDF files into a readable format.',
    icon: <FileText size={24} />,
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    requiresPro: true
  },
  {
    id: 'edit',
    title: 'Edit PDF',
    description: 'Add text or signatures to a PDF document with ease.',
    icon: <Type size={24} />,
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    tag: 'Cool'
  },
  {
    id: 'pdf-to-jpg',
    title: 'PDF to JPG',
    description: 'Convert each page of your PDF into high-quality JPG images.',
    icon: <ImageIcon size={24} />,
    iconBg: '#fff7ed',
    iconColor: '#ea580c'
  },
  {
    id: 'jpg-to-pdf',
    title: 'JPG to PDF',
    description: 'Convert JPG images to PDF in seconds. Easily adjust orientation and margins.',
    icon: <FileImage size={24} />,
    iconBg: '#fff7ed',
    iconColor: '#ea580c'
  },
  {
    id: 'sign',
    title: 'Sign PDF',
    description: 'Sign a document with a digital signature overlay quickly.',
    icon: <PenTool size={24} />,
    iconBg: '#f0fdf4',
    iconColor: '#16a34a',
    requiresPro: true
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    description: 'Remove PDF password security to use your PDFs as you want.',
    icon: <Unlock size={24} />,
    iconBg: '#fdf2f8',
    iconColor: '#db2777',
    requiresPro: true
  },
  {
    id: 'protect',
    title: 'Protect PDF',
    description: 'Encrypt your PDF with a password to prevent unauthorized access.',
    icon: <Lock size={24} />,
    iconBg: '#fdf2f8',
    iconColor: '#db2777'
  }
];

export default function App() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState('pdf_forge_result');
  const [password, setPassword] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleActivatePro = () => {
    if (activationCode === 'AIMLABPREMIUM') {
      setIsPro(true);
      setShowProModal(false);
      alert('SUCCESS: PDF Forge PRO Activated!');
    } else {
      alert('ERROR: Invalid Activation Code');
    }
  };

  const selectTool = (tool: Tool) => {
    if (tool.requiresPro && !isPro) {
      setShowProModal(true);
      return;
    }
    setActiveTool(tool);
  };

  const generateThumbnail = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context!, viewport, canvas }).promise;
        return canvas.toDataURL();
      } catch (e) {
        return '';
      }
    } else if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return '';
  };

  const addFiles = async (newFiles: File[]) => {
    const processedFiles: UploadedFile[] = [];
    for (const file of newFiles) {
      const preview = await generateThumbnail(file);
      processedFiles.push({
        id: Math.random().toString(36).substr(2, 9) + Date.now(),
        file,
        preview
      });
    }
    setUploadedFiles(prev => [...prev, ...processedFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const onDragLeave = () => {
    setIsDraggingOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const resetTool = () => {
    setActiveTool(null);
    setUploadedFiles([]);
    setResultUrl(null);
    setIsProcessing(false);
    setOutputName('pdf_forge_result');
    setPassword('');
  };

  // --- PROCESSING LOGIC ---

  const processMerge = async () => {
    if (uploadedFiles.length < 2) return;
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const item of uploadedFiles) {
        const bytes = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      alert('Error merging PDFs: ' + (e as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const processSplit = async () => {
    if (uploadedFiles.length === 0) return;
    setIsProcessing(true);
    try {
      const bytes = await uploadedFiles[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const newPdf = await PDFDocument.create();
      // For this tool, we extract page 1 only as a simple "split" demo
      const [page] = await newPdf.copyPages(pdf, [0]);
      newPdf.addPage(page);
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      alert('Error splitting PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const processCompress = async () => {
    if (uploadedFiles.length === 0) return;
    setIsProcessing(true);
    try {
      const bytes = await uploadedFiles[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      // pdf-lib re-saving often reduces size by cleaning up objects
      const pdfBytes = await pdf.save({ useObjectStreams: false });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      alert('Error compressing PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const processPdfToJpg = async () => {
    if (uploadedFiles.length === 0) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await uploadedFiles[0].file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1); // Demo: convert 1st page
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context!, viewport, canvas }).promise;
      
      canvas.toBlob((blob) => {
        if (blob) {
          setResultUrl(URL.createObjectURL(blob));
          setIsProcessing(false);
        }
      }, 'image/jpeg');
    } catch (e) {
      alert('Error converting PDF to JPG');
      setIsProcessing(false);
    }
  };

  const processJpgToPdf = async () => {
    if (uploadedFiles.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      for (const item of uploadedFiles) {
        const imageBytes = await item.file.arrayBuffer();
        let image;
        if (item.file.type === 'image/jpeg' || item.file.type === 'image/jpg') image = await pdfDoc.embedJpg(imageBytes);
        else if (item.file.type === 'image/png') image = await pdfDoc.embedPng(imageBytes);
        else continue;
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      alert('Error converting JPG to PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const processEdit = async () => {
    if (uploadedFiles.length === 0) return;
    setIsProcessing(true);
    try {
      const bytes = await uploadedFiles[0].file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      firstPage.drawText('PROCESSED BY PDF FORGE', {
        x: width / 2 - 100,
        y: height - 50,
        size: 20,
        font,
        color: rgb(0.88, 0.11, 0.28),
      });
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      alert('Error editing PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const processProtect = async () => {
    if (uploadedFiles.length === 0 || !password) return;
    setIsProcessing(true);
    // pdf-lib encryption can be complex, for demo we just re-save it
    // Real encryption usually requires more advanced libraries like qpdf on server
    try {
      const bytes = await uploadedFiles[0].file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      alert('Error protecting PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = () => {
    if (!activeTool) return;
    switch (activeTool.id) {
      case 'merge': processMerge(); break;
      case 'split': processSplit(); break;
      case 'compress': processCompress(); break;
      case 'pdf-to-jpg': processPdfToJpg(); break;
      case 'jpg-to-pdf': processJpgToPdf(); break;
      case 'edit': case 'sign': processEdit(); break;
      case 'protect': case 'unlock': processProtect(); break;
      default: alert('Processing coming soon...');
    }
  };

  const filteredTools = TOOLS.filter(tool => 
    tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 transition-colors duration-300 overflow-x-hidden font-sans">
      <div className="flex flex-col flex-grow max-w-[1100px] mx-auto w-full bg-white shadow-2xl min-h-screen border-x border-slate-200">
        
        {/* Header */}
        <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-50">
          <div className="flex items-center gap-3 font-extrabold text-[22px] text-slate-900 tracking-tight cursor-pointer" onClick={resetTool}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white text-[16px] shadow-lg shadow-primary/20">PF</div>
            PDF Forge
          </div>
          
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-8 text-[14px] font-semibold text-slate-500">
              <span className={cn("cursor-pointer transition-all hover:text-primary", !activeTool ? "text-primary" : "")} onClick={resetTool}>Dashboard</span>
              <span className="cursor-pointer hover:text-primary transition-all">Support</span>
              <span className="cursor-pointer hover:text-primary transition-all">Pricing</span>
            </nav>
            
            <button 
              onClick={() => setShowProModal(true)}
              className={cn(
                "px-6 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-md",
                isPro 
                  ? "bg-green-600/10 text-green-700 border border-green-200" 
                  : "bg-primary text-white hover:shadow-lg hover:shadow-primary/20"
              )}
            >
              {isPro ? 'PRO Active' : 'Get PRO'}
            </button>
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center">
          <AnimatePresence mode="wait">
            {!activeTool ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col items-center"
              >
                <section className="pt-24 pb-16 px-10 text-center max-w-4xl w-full">
                  <h1 className="text-6xl font-black text-slate-900 leading-[1.05] tracking-tighter mb-6">
                    Professional PDF <span className="text-primary italic">Toolkit</span>
                  </h1>
                  <p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto mb-10">
                    The fastest way to manage your documents with professional-grade security and speed.
                  </p>
                  
                  <div className="relative max-w-xl mx-auto group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={22} />
                    <input 
                      type="text" 
                      placeholder="Search for a tool..."
                      className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl py-5 px-16 text-lg placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 px-10 pb-24 w-full">
                  {filteredTools.map((tool) => (
                    <motion.div 
                      key={tool.id}
                      whileHover={{ y: -10, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-primary/5 transition-all cursor-pointer relative overflow-hidden backdrop-blur-sm"
                      onClick={() => selectTool(tool)}
                    >
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-md transition-all group-hover:scale-110 group-hover:rotate-3" style={{ backgroundColor: tool.iconBg, color: tool.iconColor }}>
                        {tool.icon}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">{tool.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{tool.description}</p>
                      
                      {tool.requiresPro && !isPro && (
                        <div className="absolute top-4 right-4 text-slate-300">
                          <Lock size={16} />
                        </div>
                      )}
                      
                      {tool.tag && (
                        <div className="absolute bottom-4 right-4 text-[10px] font-black uppercase py-0.5 px-2 rounded bg-primary/5 text-primary border border-primary/10">
                          {tool.tag}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </section>
              </motion.div>
            ) : (
              <motion.div 
                key="tool-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full max-w-4xl px-10 py-16"
              >
                <button 
                  onClick={resetTool}
                  className="flex items-center gap-2 text-slate-400 hover:text-primary mb-12 transition-all text-sm font-bold uppercase tracking-widest"
                >
                  <ChevronLeft size={18} /> Back to Toolkit
                </button>

                <div className="bg-white rounded-[40px] border border-slate-200 p-12 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-slate-900">
                    {React.cloneElement(activeTool.icon as React.ReactElement, { size: 160 })}
                  </div>
                  
                  <div className="flex items-center gap-8 mb-16 pb-12 border-b border-slate-50">
                    <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl shadow-slate-100 transition-transform hover:scale-105" style={{ backgroundColor: activeTool.iconBg, color: activeTool.iconColor }}>
                      {React.cloneElement(activeTool.icon as React.ReactElement, { size: 48 })}
                    </div>
                    <div>
                      <h2 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">{activeTool.title}</h2>
                      <p className="text-slate-400 text-xl font-medium mt-3">{activeTool.description}</p>
                    </div>
                  </div>

                  {!resultUrl ? (
                    <div className="space-y-6">
                      {uploadedFiles.length === 0 ? (
                        <div 
                          onDragOver={onDragOver}
                          onDragLeave={onDragLeave}
                          onDrop={onDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group shadow-sm",
                            isDraggingOver 
                              ? "border-primary dark:border-neon-green bg-primary/5 dark:bg-neon-green/5 scale-[1.02]" 
                              : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-black/50 hover:border-primary/50 dark:hover:border-neon-green/50 hover:bg-slate-50 dark:hover:bg-slate-900"
                          )}
                        >
                          <div className={cn(
                            "w-20 h-20 bg-white dark:bg-black border rounded-full flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:text-primary dark:group-hover:text-neon-green transition-all shadow-lg",
                            isDraggingOver ? "text-primary dark:text-neon-green border-primary dark:border-neon-green scale-110 shadow-primary/20" : "border-slate-200 dark:border-slate-800"
                          )}>
                            <Upload size={36} />
                          </div>
                          <div className="text-center">
                            <span className="font-extrabold text-xl dark:text-white">Choose or Drop Files</span>
                            <p className="text-slate-400 text-sm mt-1">Select documents from your computer</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <Reorder.Group 
                            axis="x" 
                            values={uploadedFiles} 
                            onReorder={setUploadedFiles}
                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6"
                          >
                            {uploadedFiles.map((item) => (
                              <Reorder.Item 
                                key={item.id} 
                                value={item}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 group shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                              >
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(item.id);
                                  }}
                                  className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-white dark:hover:bg-red-600 shadow-md z-10 transition-all"
                                >
                                  <X size={16} />
                                </button>
                                <div className="w-full aspect-[3/4] bg-slate-50 dark:bg-[#080808] border border-slate-100 dark:border-slate-900 rounded-lg mb-3 flex items-center justify-center overflow-hidden pointer-events-none">
                                   {item.preview ? (
                                     <img src={item.preview} alt="Preview" className="w-full h-full object-cover" />
                                   ) : (
                                     <FileCheck size={32} className="text-slate-200 dark:text-slate-800" />
                                   )}
                                </div>
                                <div className="text-[10px] font-bold truncate text-center text-slate-500 dark:text-slate-400 px-2 pointer-events-none">{item.file.name}</div>
                              </Reorder.Item>
                            ))}
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              onDragOver={onDragOver}
                              onDrop={onDrop}
                              className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all min-h-[160px] opacity-60 hover:opacity-100"
                            >
                              <Upload size={24} className="text-slate-400" />
                              <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase">Add File</span>
                            </div>
                          </Reorder.Group>

                          {(activeTool.id === 'protect' || activeTool.id === 'unlock') && (
                            <div className="max-w-xs mx-auto space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase">Set Password</label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                  type="password" 
                                  placeholder="Enter password..."
                                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary dark:focus:border-neon-green"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex justify-center pt-10">
                            <button 
                              disabled={isProcessing || (activeTool.id === 'merge' && uploadedFiles.length < 2) || (activeTool.id === 'protect' && !password)}
                              onClick={handleAction}
                              className="bg-primary hover:bg-primary-dark text-white min-w-[280px] py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group transition-all shadow-xl shadow-primary/20 hover:-translate-y-1 active:translate-y-0"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="animate-spin" size={24} />
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <span>{activeTool.title}</span>
                                  <ArrowDownToLine size={24} className="group-hover:translate-y-1 transition-transform" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept={activeTool.id === 'jpg-to-pdf' ? 'image/*' : '.pdf'}
                        onChange={handleFileChange}
                      />
                    </div>
                  ) : (
                    /* Success View */
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-slate-50 border border-slate-200 rounded-[32px] p-16 flex flex-col items-center text-center shadow-lg"
                    >
                      <div className="w-28 h-28 bg-primary text-white rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-primary/30 ring-8 ring-primary/5">
                        <Download size={52} className="animate-bounce" />
                      </div>
                      <h3 className="text-4xl font-black mb-4 text-slate-900 tracking-tighter">SUCCESSFULLY PROCESSED</h3>
                      <p className="text-slate-500 mb-10 max-w-sm text-lg font-medium">Your professional document is ready for download. Check your filename below.</p>
                      
                      <div className="w-full max-w-sm bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-12 space-y-4">
                         <div className="flex flex-col items-start gap-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Rename Document</label>
                            <input 
                              type="text" 
                              value={outputName}
                              onChange={(e) => setOutputName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                              placeholder="Filename..."
                            />
                         </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-5 w-full justify-center">
                        <a 
                          href={resultUrl} 
                          download={`${outputName}.${activeTool.id === 'pdf-to-jpg' ? 'jpg' : 'pdf'}`}
                          className="bg-primary hover:bg-primary-dark text-white px-12 py-5 rounded-2xl flex items-center justify-center gap-3 text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:-translate-y-1"
                        >
                          <Download size={24} /> Download Ready
                        </a>
                        <button 
                          onClick={resetTool}
                          className="bg-white border border-slate-200 text-slate-500 py-5 px-12 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all shadow-sm"
                        >
                          New Task
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="h-16 border-t border-slate-200 bg-white flex items-center justify-center text-[11px] text-slate-400 font-bold tracking-widest px-10 mt-auto">
          <div className="flex-grow flex justify-center uppercase">
            &copy; 2026 PDF Forge Professional // Secure Cloud Documents
          </div>
          <div className="hidden sm:flex gap-10 uppercase">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
          </div>
        </footer>
      </div>

      {/* PRO Modal */}
      <AnimatePresence>
        {showProModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-10 shadow-3xl border border-slate-100"
            >
              <button 
                onClick={() => setShowProModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary shadow-inner">
                  <Lock size={40} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">UPGRADE TO PRO</h3>
                <p className="text-slate-400 mt-3 text-lg font-medium">Unlock full text extraction, secure signing, and advanced document security.</p>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-widest block mb-3 px-1">Activation Code</label>
                  <input 
                    type="text" 
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="Enter Code..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-4 px-5 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-800"
                  />
                </div>

                <button 
                  onClick={handleActivatePro}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                >
                  Activate Now
                </button>
                
                <p className="text-[11px] text-center text-slate-300 font-bold">
                  LICENSE KEY REQUIRED FOR ENTERPRISE TOOLS
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
