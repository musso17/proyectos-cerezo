import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';
import useStore from '../../hooks/useStore';

export default function VideoReviewPlayer({ project, onApprove }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const videoRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      toast.success('Video cargado para revisión');
      // En una implementación real, aquí se subiría a Supabase Storage
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const addComment = () => {
    if (!newComment.trim() || !videoRef.current) return;
    const time = videoRef.current.currentTime;
    setComments([...comments, { text: newComment, time, id: Date.now() }]);
    setNewComment('');
    toast.success('Comentario añadido en ' + formatTime(time));
  };

  const seekTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl p-4 text-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg text-blue-400">Revisión de Entregables</h3>
        {videoUrl && (
          <button
            onClick={onApprove}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
          >
            <CheckCircle size={18} />
            Aprobar Video
          </button>
        )}
      </div>

      {!videoUrl ? (
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center bg-slate-800/50">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
            id="video-upload"
          />
          <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
            <span className="text-4xl mb-3">📁</span>
            <span className="text-slate-300 font-medium">Arrastra el archivo de video final aquí</span>
            <span className="text-slate-500 text-sm mt-1">o haz clic para explorar</span>
          </label>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full rounded-lg bg-black shadow-lg"
            />
          </div>
          <div className="w-full md:w-64 flex flex-col gap-3">
            <div className="bg-slate-800 rounded-lg p-3">
              <h4 className="font-medium text-slate-300 text-sm mb-3">Historial de Cambios</h4>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto soft-scroll pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No hay comentarios aún.</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="bg-slate-700 rounded p-2 text-sm flex flex-col gap-1">
                      <button 
                        onClick={() => seekTo(c.time)}
                        className="text-blue-400 text-xs font-mono text-left hover:underline"
                      >
                        {formatTime(c.time)}
                      </button>
                      <p className="text-slate-200">{c.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-auto">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Añadir nota con pin (ej. Quita este destello)..."
                className="w-full rounded-lg bg-slate-800 border border-slate-700 p-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                rows={2}
              />
              <button
                onClick={addComment}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-all"
              >
                Dejar nota en {videoRef.current ? formatTime(videoRef.current.currentTime || 0) : '00:00'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
