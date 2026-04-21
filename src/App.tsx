import React, { useState, useRef } from 'react';
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
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument } from 'pdf-lib';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
    description: 'Easily convert your PDF files into easy to edit DOC and DOCX documents.',
    icon: <FileText size={24} />,
    iconBg: '#eff6ff',
    iconColor: '#2563eb'
  },
  {
    id: 'edit',
    title: 'Edit PDF',
    description: 'Add text, images, shapes or freehand annotations to a PDF document.',
    icon: <Type size={24} />,
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    tag: 'Beta'
  },
  {
    id: 'pdf-to-jpg',
    title: 'PDF to JPG',
    description: 'Extract all images from a PDF or convert each page to a JPG image.',
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
    description: 'Sign a document and request signatures. Simple, fast and secure.',
    icon: <PenTool size={24} />,
    iconBg: '#f0fdf4',
    iconColor: '#16a34a'
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    description: 'Remove PDF password security, giving you the freedom to use your PDFs.',
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTools = TOOLS.filter(tool => 
    tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetTool = () => {
    setActiveTool(null);
    setFiles([]);
    setResultUrl(null);
    setIsProcessing(false);
  };

  const processMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await fetch('/api/pdf/merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Merge failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (error) {
      console.error(error);
      alert('Failed to merge PDFs');
    } finally {
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
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (file.type === 'image/png') {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          continue;
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (error) {
      console.error(error);
      alert('Failed to convert images to PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const processSplit = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      const response = await fetch('/api/pdf/split', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Split failed');
      const blob = await response.blob();
      setResultUrl(URL.createObjectURL(blob));
    } catch (error) {
      alert('Failed to split PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = () => {
    if (!activeTool) return;
    if (activeTool.id === 'merge') processMerge();
    else if (activeTool.id === 'jpg-to-pdf') processJpgToPdf();
    else if (activeTool.id === 'split') processSplit();
    else {
      alert(`${activeTool.title} is coming soon in this demo!`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-x-hidden">
      {/* Container to give that fixed-ish scale feel */}
      <div className="flex flex-col flex-grow max-w-[1024px] mx-auto w-full bg-white shadow-xl min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-2 font-extrabold text-[20px] text-slate-900 tracking-tight cursor-pointer" onClick={resetTool}>
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white text-[14px]">PDF</div>
          Forge
        </div>
        
        <div className="hidden md:flex items-center gap-6 text-[14px] font-medium">
          <span className="text-primary cursor-pointer" onClick={resetTool}>Home</span>
          <span className="cursor-pointer hover:text-primary transition-colors">Products</span>
          <span className="cursor-pointer hover:text-primary transition-colors">Pricing</span>
          <span className="cursor-pointer hover:text-primary transition-colors">API</span>
          <button className="btn-primary">Get Pro</button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center">
        {!activeTool ? (
          <>
            {/* Hero */}
            <section className="pt-12 pb-8 px-8 text-center max-w-4xl w-full">
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="hero-title"
              >
                Every tool you need to work with PDFs
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="hero-subtitle"
              >
                Merge, edit, compress, and convert documents in seconds.
              </motion.p>
              
              <div className="relative max-w-lg mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search for a tool..."
                  className="w-full bg-slate-100 border border-slate-200 rounded-full py-3 px-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </section>

            {/* Tool Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-8 pb-16 w-full max-w-7xl">
              {filteredTools.map((tool) => (
                <motion.div 
                  key={tool.id}
                  whileHover={{ y: -4 }}
                  className="tool-card group"
                  onClick={() => setActiveTool(tool)}
                >
                  <div className="tool-icon" style={{ backgroundColor: tool.iconBg, color: tool.iconColor }}>
                    {tool.icon}
                  </div>
                  <div className="tool-title">{tool.title}</div>
                  <div className="tool-desc">{tool.description}</div>
                  {tool.tag && (
                    <div className="absolute top-2 right-2 text-[8px] font-bold uppercase py-0.5 px-1.5 rounded-full bg-slate-100 text-slate-600">
                      {tool.tag}
                    </div>
                  )}
                </motion.div>
              ))}
            </section>
          </>
        ) : (
          /* Tool Interface */
          <div className="w-full max-w-4xl px-8 py-12">
            <button 
              onClick={resetTool}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-900 mb-8 transition-colors text-sm font-medium"
            >
              <ChevronLeft size={16} /> Back to Tools
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: activeTool.iconBg, color: activeTool.iconColor }}>
                  {React.cloneElement(activeTool.icon as React.ReactElement, { size: 32 })}
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight">{activeTool.title}</h2>
                  <p className="text-slate-600">{activeTool.description}</p>
                </div>
              </div>

              {!resultUrl ? (
                <div className="space-y-6">
                  {files.length === 0 ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-slate-50 transition-all group"
                    >
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                      </div>
                      <div className="text-center">
                        <span className="font-bold text-lg">Select PDF files</span>
                        <p className="text-slate-400 text-sm">or drop PDFs here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {files.map((file, i) => (
                          <div key={i} className="relative bg-slate-50 border border-slate-200 rounded-lg p-4 group">
                            <button 
                              onClick={() => removeFile(i)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm z-10"
                            >
                              <X size={14} />
                            </button>
                            <div className="w-full aspect-[3/4] bg-white border border-slate-100 rounded mb-2 flex items-center justify-center">
                               {file.type.includes('pdf') ? <FileText size={24} className="text-slate-200" /> : <ImageIcon size={24} className="text-slate-200" />}
                            </div>
                            <div className="text-xs font-medium truncate text-center">{file.name}</div>
                          </div>
                        ))}
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all min-h-[160px]"
                        >
                          <Upload size={20} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-600">Add more</span>
                        </div>
                      </div>

                      <div className="flex justify-center pt-8">
                        <button 
                          disabled={isProcessing || (activeTool.id === 'merge' && files.length < 2)}
                          onClick={handleAction}
                          className="btn-primary px-12 py-3 text-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="animate-spin" size={20} />
                              Processing...
                            </>
                          ) : (
                            activeTool.title
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-100 rounded-xl p-12 flex flex-col items-center text-center"
                >
                  <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
                    <Download size={40} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">PDF has been processed!</h3>
                  <p className="text-slate-600 mb-8 max-w-md">Your files were merged successfully. You can now download the result.</p>
                  
                  <div className="flex gap-4">
                    <a 
                      href={resultUrl} 
                      download="pdf_oasis_result.pdf"
                      className="btn-primary px-8 py-3 flex items-center gap-2 text-base"
                    >
                      <Download size={20} /> Download PDF
                    </a>
                    <button 
                      onClick={resetTool}
                      className="bg-white border border-slate-200 text-slate-600 py-3 px-8 rounded-md font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Process another
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </main>

        {/* Footer */}
        <footer className="h-12 border-t border-slate-200 bg-white flex items-center justify-center text-xs text-slate-400 mt-auto">
          &copy; 2026 PDF Forge. Secure, Reliable, and Simple document management.
          <span className="mx-2">&bull;</span>
          <a href="#" className="text-slate-600 hover:underline">Privacy Policy</a>
          <span className="mx-2">&bull;</span>
          <a href="#" className="text-slate-600 hover:underline">Terms of Service</a>
        </footer>
      </div>
    </div>
  );
}
