import { useState, useRef, useEffect } from 'react';
import { Upload, Send, Download, LogOut, User, Shield,  Zap, Sparkles, Cloud, FileText, X } from 'lucide-react';

export default function FileTransfer() {
  const [activeTab, setActiveTab] = useState('transfer');
  type SelectedFile = { name: string; size: string; id: string; type: string };
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [endToEndEncryption, setEndToEndEncryption] = useState(true);
  const [setExpiryDate, setSetExpiryDate] = useState(false);
  const [userName] = useState('John Doe');
  const [dragActive, setDragActive] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Floating particles effect
  const [particles, setParticles] = useState<Array<{id: number; x: number; y: number; size: number; delay: number}>>([]);

  useEffect(() => {
    // Generate floating particles
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 5
    }));
    setParticles(newParticles);
  }, []);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files).map(file => ({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        id: Math.random().toString(36).substr(2, 9),
        type: file.type.split('/')[1] || 'file'
      }));
      setSelectedFiles([...selectedFiles, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files).map(file => ({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        id: Math.random().toString(36).substr(2, 9),
        type: file.type.split('/')[1] || 'file'
      }));
      setSelectedFiles([...selectedFiles, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles(selectedFiles.filter(file => file.id !== id));
  };

  const handleSendFiles = async () => {
    if (selectedFiles.length > 0 && recipientAddress) {
      setIsSending(true);
      // Simulate sending process
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsSending(false);
      alert('Files sent securely! 🚀');
      setSelectedFiles([]);
      setRecipientAddress('');
    }
  };

  const getFileIcon = (type: string) => {
    const icons = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      jpg: '🖼',
      png: '🖼',
      mp4: '🎬',
      mp3: '🎵',
      zip: '📦',
      default: '📁'
    };
    return icons[type as keyof typeof icons] || icons.default;
  };

  // Truncate long file names
  const truncateFileName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-r from-cyan-400/20 to-purple-400/20"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animation: `float ${8 + particle.delay}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
        
        {/* Animated Grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px),
                             linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }} />
        </div>

        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
      </div>

      {/* Header */}
      <header className="relative z-50 bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center shadow-2xl transform rotate-12 hover:rotate-0 transition-all duration-500 group">
                  <Zap className="w-6 h-6 text-white" />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-ping" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  ChainShare
                </span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-green-400 font-mono">Blockchain Secured</span>
                </div>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-2 bg-slate-800/50 rounded-2xl p-1 backdrop-blur-sm border border-slate-700/50">
              {[
                { id: 'transfer', icon: Upload, label: 'Transfer' },
                { id: 'send', icon: Send, label: 'Send' },
                { id: 'receive', icon: Download, label: 'Receive' }
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-500 ${
                    activeTab === id
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg'
                      : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold">{label}</span>
                </button>
              ))}
            </nav>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-slate-800/60 px-4 py-2 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-sm hover:bg-slate-700/60 transition-all duration-300 group">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-30 blur transition-opacity duration-500" />
                </div>
                <div>
                  <span className="font-semibold text-white">{userName}</span>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">Verified</span>
                  </div>
                </div>
              </div>
              <button className="flex items-center space-x-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500/20 transition-all duration-300 border border-red-500/20 hover:border-red-500/40 hover:shadow-lg group">
                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-40 max-w-7xl mx-auto px-6 py-8">
        <div className="text-center mb-12 animate-float-in">
          <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
            Quantum Secure File Transfer
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Leverage blockchain-powered encryption for military-grade file security
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Files Section */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-500 group h-fit">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                  <div className="p-2 bg-cyan-500/20 rounded-xl">
                    <Upload className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span>Quantum Upload</span>
                </h2>
                <div className="flex items-center space-x-2 text-cyan-400">
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-mono">{selectedFiles.length} Files</span>
                </div>
              </div>
              
              <div
                className={`relative border-3 border-dashed rounded-2xl p-8 text-center transition-all duration-500 group cursor-pointer ${
                  dragActive
                    ? 'border-cyan-400 bg-cyan-500/10 scale-105 shadow-2xl'
                    : 'border-slate-600 hover:border-cyan-400 hover:bg-slate-700/30 hover:shadow-xl'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <Cloud className="w-8 h-8 text-cyan-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white mb-2">
                      Drop files here
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold cursor-pointer hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 inline-block shadow-xl hover:shadow-cyan-500/25 transform hover:-translate-y-0.5">
                      Browse Files
                    </span>
                  </div>
                </div>
              </div>

              {/* Compact Selected Files Section */}
              <div className="mt-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Selected Files ({selectedFiles.length})</span>
                </h3>
                
                {selectedFiles.length === 0 ? (
                  <div className="text-center py-8 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-600 hover:border-cyan-400/50 transition-colors duration-300">
                    <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No files selected</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-600 hover:border-cyan-400/50 hover:shadow-lg transition-all duration-300 group animate-slide-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-sm">{getFileIcon(file.type)}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white text-sm truncate" title={file.name}>
                              {truncateFileName(file.name, 18)}
                            </p>
                            <p className="text-cyan-400 text-xs font-mono">{file.size}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all duration-200 border border-red-500/20 hover:border-red-500/40 flex-shrink-0 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Recipient Details */}
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-slate-700/50 hover:border-purple-500/30 transition-all duration-500 group">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <User className="w-5 h-5 text-purple-400" />
                <span>Recipient</span>
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-cyan-400 mb-2">
                    Wallet Address
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="0xabc123..."
                      className="w-full px-4 py-3 bg-slate-900/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors duration-300 pl-10 font-mono text-sm backdrop-blur-sm"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 bg-gradient-to-br from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
                        <User className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-500 group">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span>Security</span>
              </h2>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-700/30 cursor-pointer transition-all duration-300 group/checkbox border border-slate-600 hover:border-cyan-500/30">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={endToEndEncryption}
                      onChange={(e) => setEndToEndEncryption(e.target.checked)}
                      className="w-5 h-5 bg-slate-700 border-2 border-cyan-500 rounded-lg focus:ring-2 focus:ring-cyan-500/50 checked:bg-cyan-500 appearance-none transition-colors duration-300"
                    />
                    {endToEndEncryption && (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="w-2 h-2 bg-white rounded-sm" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Quantum Encryption</p>
                    <p className="text-xs text-cyan-400">AES-256 + Blockchain</p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-700/30 cursor-pointer transition-all duration-300 group/checkbox border border-slate-600 hover:border-purple-500/30">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={setExpiryDate}
                      onChange={(e) => setSetExpiryDate(e.target.checked)}
                      className="w-5 h-5 bg-slate-700 border-2 border-purple-500 rounded-lg focus:ring-2 focus:ring-purple-500/50 checked:bg-purple-500 appearance-none transition-colors duration-300"
                    />
                    {setExpiryDate && (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="w-2 h-2 bg-white rounded-sm" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Auto Expiry</p>
                    <p className="text-xs text-purple-400">24h limit</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendFiles}
              disabled={selectedFiles.length === 0 || !recipientAddress || isSending}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold text-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-xl hover:shadow-cyan-500/25 transform hover:-translate-y-1 disabled:transform-none flex items-center justify-center space-x-2 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md" />
              <span className="relative z-10 flex items-center space-x-2">
                {isSending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Encoding...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Transfer Files</span>
                  </>
                )}
              </span>
            </button>
            
            <div className="text-center">
              <p className="text-slate-400 text-xs">
                {selectedFiles.length === 0 && 'Select files to begin'}
                {selectedFiles.length > 0 && !recipientAddress && 'Enter recipient address'}
                {selectedFiles.length > 0 && recipientAddress && 'Ready to transfer'}
              </p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes float-in {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          33% { transform: translateY(-15px) translateX(8px) rotate(120deg); }
          66% { transform: translateY(-8px) translateX(-8px) rotate(240deg); }
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-float-in {
          animation: float-in 0.8s ease-out;
        }

        .animate-slide-in {
          animation: slide-in 0.4s ease-out forwards;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #06b6d4, #8b5cf6);
          border-radius: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #0891b2, #7c3aed);
        }
      `}</style>
    </div>
  );
}