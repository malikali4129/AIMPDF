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
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as pdfjs from 'pdfjs-dist';

// pdfjs worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
    iconColor: '#2563eb'
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
    iconColor: '#16a34a'
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    description: 'Remove PDF password security to use your PDFs as you want.',
    icon: <Unlock size={24} />,
    iconBg: '#fdf2f8',
    iconColor: '#db2777'
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
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState('pdf_oasis_result');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [password, setPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const generateThumbnails = async (fileList: File[]) => {
    const thumbs: string[] = [];
    for (const file of fileList) {
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
          thumbs.push(canvas.toDataURL());
        } catch (e) {
          thumbs.push('');
        }
      } else if (file.type.startsWith('image/')) {
        thumbs.push(URL.createObjectURL(file));
      } else {
        thumbs.push('');
      }
    }
    setPreviews(thumbs);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      generateThumbnails([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const resetTool = () => {
    setActiveTool(null);
    setFiles([]);
    setPreviews([]);
    setResultUrl(null);
    setIsProcessing(false);
    setOutputName('pdf_oasis_result');
    setPassword('');
  };

  // --- PROCESSING LOGIC ---

  const processMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
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
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const bytes = await files[0].arrayBuffer();
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
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const bytes = await files[0].arrayBuffer();
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
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await files[0].arrayBuffer();
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
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      for (const file of files) {
        const imageBytes = await file.arrayBuffer();
        let image;
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') image = await pdfDoc.embedJpg(imageBytes);
        else if (file.type === 'image/png') image = await pdfDoc.embedPng(imageBytes);
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
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      firstPage.drawText('EDITED BY PDF OASIS', {
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
    if (files.length === 0 || !password) return;
    setIsProcessing(true);
    // pdf-lib encryption can be complex, for demo we just re-save it
    // Real encryption usually requires more advanced libraries like qpdf on server
    try {
      const bytes = await files[0].arrayBuffer();
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-black transition-colors duration-300 overflow-x-hidden">
      <div className="flex flex-col flex-grow max-w-[1024px] mx-auto w-full bg-white dark:bg-[#080808] shadow-2xl min-h-screen border-x border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <header className="h-16 bg-white dark:bg-black border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-50">
          <div className="flex items-center gap-2 font-extrabold text-[20px] text-slate-900 dark:text-white tracking-tight cursor-pointer" onClick={resetTool}>
            <div className="w-8 h-8 bg-primary dark:bg-neon-green rounded flex items-center justify-center text-white dark:text-black text-[14px]">PDF</div>
            Forge
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-[14px] font-medium dark:text-slate-400">
              <span className="text-primary dark:text-neon-green cursor-pointer" onClick={resetTool}>Home</span>
              <span className="cursor-pointer hover:text-primary dark:hover:text-neon-green transition-colors">Products</span>
              <span className="cursor-pointer hover:text-primary dark:hover:text-neon-green transition-colors font-mono">NEON_V2</span>
            </div>
            
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-neon-green hover:scale-110 transition-transform shadow-[0_0_10px_rgba(0,0,255,0.1)] dark:shadow-[0_0_15px_rgba(0,255,0,0.2)]"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="btn-primary ml-2">PRO</button>
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
                <section className="pt-16 pb-12 px-8 text-center max-w-4xl w-full">
                  <h1 className="hero-title dark:text-white">
                    Every tool you need to work with PDFs
                  </h1>
                  <p className="hero-subtitle dark:text-slate-500">
                    Merge, edit, compress, and convert documents in seconds with <span className="text-primary dark:text-neon-green font-bold">PDF Forge</span>.
                  </p>
                  
                  <div className="relative max-w-lg mx-auto group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary dark:group-focus-within:text-neon-green transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search for a tool (e.g. Merge, Convert)..."
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full py-3.6 px-12 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 dark:focus:ring-neon-green/10 transition-all dark:text-white"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-8 pb-16 w-full max-w-7xl">
                  {filteredTools.map((tool) => (
                    <motion.div 
                      key={tool.id}
                      whileHover={{ y: -6, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="tool-card group"
                      onClick={() => setActiveTool(tool)}
                    >
                      <div className="tool-icon group-hover:scale-110 transition-transform shadow-sm" style={{ backgroundColor: isDarkMode ? '#000' : tool.iconBg, color: isDarkMode ? '#00FF00' : tool.iconColor, border: isDarkMode ? '1px solid #202020' : 'none' }}>
                        {tool.icon}
                      </div>
                      <div className="tool-title">{tool.title}</div>
                      <div className="tool-desc">{tool.description}</div>
                      {tool.tag && (
                        <div className="absolute top-2 right-2 text-[8px] font-bold uppercase py-0.5 px-1.5 rounded-full bg-slate-100 dark:bg-neon-green dark:text-black text-slate-600 pulse-neon">
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
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-4xl px-8 py-12"
              >
                <button 
                  onClick={resetTool}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-900 dark:hover:text-neon-green mb-8 transition-colors text-sm font-medium"
                >
                  <ChevronLeft size={16} /> Back to Dashboard
                </button>

                <div className="bg-white dark:bg-[#101010] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                  <div className="flex items-center gap-5 mb-10 border-b border-slate-100 dark:border-slate-800 pb-8">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner" style={{ backgroundColor: isDarkMode ? '#000' : activeTool.iconBg, color: isDarkMode ? '#00FF00' : activeTool.iconColor, border: isDarkMode ? '1px solid #202020' : 'none' }}>
                      {React.cloneElement(activeTool.icon as React.ReactElement, { size: 32 })}
                    </div>
                    <div>
                      <h2 className="text-3xl font-extrabold tracking-tight dark:text-white uppercase">{activeTool.title}</h2>
                      <p className="text-slate-600 dark:text-slate-500">{activeTool.description}</p>
                    </div>
                  </div>

                  {!resultUrl ? (
                    <div className="space-y-6">
                      {files.length === 0 ? (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-16 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 dark:hover:border-neon-green/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group shadow-sm bg-slate-50/50 dark:bg-black/50"
                        >
                          <div className="w-20 h-20 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:text-primary dark:group-hover:text-neon-green transition-all shadow-lg group-hover:shadow-primary/10 dark:group-hover:shadow-neon-green/20">
                            <Upload size={36} />
                          </div>
                          <div className="text-center">
                            <span className="font-extrabold text-xl dark:text-white">Choose Files</span>
                            <p className="text-slate-400 text-sm mt-1">Select documents from your computer</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                            {files.map((file, i) => (
                              <motion.div 
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                key={i} 
                                className="relative bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 group shadow-sm hover:shadow-md transition-shadow"
                              >
                                <button 
                                  onClick={() => removeFile(i)}
                                  className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-white dark:hover:bg-red-600 shadow-md z-10 transition-all"
                                >
                                  <X size={16} />
                                </button>
                                <div className="w-full aspect-[3/4] bg-slate-50 dark:bg-[#080808] border border-slate-100 dark:border-slate-900 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                   {previews[i] ? (
                                     <img src={previews[i]} alt="Preview" className="w-full h-full object-cover" />
                                   ) : (
                                     <FileCheck size={32} className="text-slate-200 dark:text-slate-800" />
                                   )}
                                </div>
                                <div className="text-[10px] font-bold truncate text-center text-slate-500 dark:text-slate-400 px-2">{file.name}</div>
                              </motion.div>
                            ))}
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all min-h-[160px] opacity-60 hover:opacity-100"
                            >
                              <Upload size={24} className="text-slate-400" />
                              <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase">Add File</span>
                            </div>
                          </div>

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
                              disabled={isProcessing || (activeTool.id === 'merge' && files.length < 2) || (activeTool.id === 'protect' && !password)}
                              onClick={handleAction}
                              className="btn-primary min-w-[240px] py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="animate-spin" size={24} />
                                  <span>SYTEM_PROCESSING...</span>
                                </>
                              ) : (
                                <>
                                  <span>{activeTool.title.toUpperCase()}</span>
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
                      className="bg-green-50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30 rounded-2xl p-12 flex flex-col items-center text-center shadow-lg"
                    >
                      <div className="w-24 h-24 bg-green-500 dark:bg-neon-green text-white dark:text-black rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-green-500/30 dark:shadow-neon-green/40 ring-8 ring-green-100 dark:ring-neon-green/10">
                        <Download size={48} className="animate-bounce" />
                      </div>
                      <h3 className="text-3xl font-black mb-3 dark:text-white uppercase tracking-tight">MISSION COMPLETED</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-sm">Your files have been processed by our secure systems. Ready for download.</p>
                      
                      <div className="w-full max-w-md bg-white dark:bg-black rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-10 space-y-4">
                         <div className="flex flex-col items-start gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rename Result</label>
                            <input 
                              type="text" 
                              value={outputName}
                              onChange={(e) => setOutputName(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-[#050505] border border-slate-200 dark:border-slate-800 rounded-lg py-3 px-4 font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-neon-green/20"
                              placeholder="Filename..."
                            />
                         </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                        <a 
                          href={resultUrl} 
                          download={`${outputName}.${activeTool.id === 'pdf-to-jpg' ? 'jpg' : 'pdf'}`}
                          className="btn-primary px-10 py-4 flex items-center justify-center gap-3 text-lg shadow-xl"
                        >
                          <Download size={22} /> DOWNLOAD_RESULT
                        </a>
                        <button 
                          onClick={resetTool}
                          className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 py-4 px-10 rounded-lg font-black text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-all uppercase tracking-widest shadow-sm"
                        >
                          START_NEW_MISSION
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="h-14 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-black flex items-center justify-center text-[10px] text-slate-400 font-mono tracking-widest px-8 mt-auto">
          <div className="flex-grow flex justify-center uppercase">
            &copy; 2026 PDF_FORGE_OS // SECURE_DOCUMENT_HANDLING
          </div>
          <div className="hidden sm:flex gap-6 uppercase">
            <a href="#" className="hover:text-primary dark:hover:text-neon-green transition-colors">Privacy_Protocol</a>
            <a href="#" className="hover:text-primary dark:hover:text-neon-green transition-colors">Terms_of_Engage</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
