import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from 'axios';

const VIDEO_TYPES = [
  { id: 'church_promo', name: 'Church Promo Video', duration: '60s', description: 'Welcome to our church' },
  { id: 'sunday_announcement', name: 'Sunday Announcement', duration: '30s', description: 'Join us this Sunday' },
  { id: 'event_promo', name: 'Event Promo', duration: '30s', description: 'Promote specific event' },
  { id: 'pastor_intro', name: 'Pastor Introduction', duration: '45s', description: 'Introduce the pastor' },
  { id: 'whatsapp_status', name: 'WhatsApp Status', duration: '30s', description: 'Vertical video for WhatsApp' }
];

const MUSIC_STYLES = [
  { id: 'gospel', name: 'Gospel', description: 'Uplifting gospel choir style' },
  { id: 'contemporary', name: 'Contemporary', description: 'Modern worship feel' },
  { id: 'classical', name: 'Classical', description: 'Traditional hymn style' },
  { id: 'ambient', name: 'Ambient', description: 'Peaceful instrumental' },
  { id: 'upbeat', name: 'Upbeat', description: 'Energetic contemporary' }
];

export default function Videos() {
  const [step, setStep] = useState(1);
  const [videoType, setVideoType] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [musicStyle, setMusicStyle] = useState('');
  const [galleryImages, setGalleryImages] = useState([]);
  const [generatedVideos, setGeneratedVideos] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const churchId = localStorage.getItem('church_id');
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadGalleryImages();
    loadGeneratedVideos();
  }, []);

  useEffect(() => {
    if (currentJob) {
      const interval = setInterval(() => checkJobStatus(), 3000);
      return () => clearInterval(interval);
    }
  }, [currentJob]);

  const loadGalleryImages = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/churches/${churchId}`);
      setGalleryImages(response.data.gallery || []);
    } catch (err) {
      console.error('Failed to load gallery:', err);
    }
  };

  const loadGeneratedVideos = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/videos/${churchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeneratedVideos(response.data.videos || []);
    } catch (err) {
      console.error('Failed to load videos:', err);
    }
  };

  const handleImageToggle = (imageId) => {
    if (selectedImages.includes(imageId)) {
      setSelectedImages(selectedImages.filter(id => id !== imageId));
    } else if (selectedImages.length < 10) {
      setSelectedImages([...selectedImages, imageId]);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(selectedImages);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setSelectedImages(items);
  };

  const generateVideo = async () => {
    if (!videoType || selectedImages.length < 3 || !musicStyle) {
      setError('Please complete all steps');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/videos/generate`,
        {
          church_id: churchId,
          video_type: videoType,
          image_ids: selectedImages,
          music_style: musicStyle
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCurrentJob(response.data.job_id);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate video');
    } finally {
      setLoading(false);
    }
  };

  const checkJobStatus = async () => {
    if (!currentJob) return;

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/videos/status/${currentJob}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProgress(response.data.progress);

      if (response.data.status === 'complete') {
        setCurrentJob(null);
        loadGeneratedVideos();
        resetForm();
      } else if (response.data.status === 'failed') {
        setError(response.data.error || 'Video generation failed');
        setCurrentJob(null);
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  };

  const resetForm = () => {
    setStep(1);
    setVideoType('');
    setSelectedImages([]);
    setMusicStyle('');
    setProgress(0);
  };

  const deleteVideo = async (jobId) => {
    if (!window.confirm('Delete this video?')) return;

    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/videos/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadGeneratedVideos();
    } catch (err) {
      alert('Failed to delete video');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Video Generator</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {currentJob ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-4">
            <svg className="animate-spin h-16 w-16 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Generating Your Video...</h2>
          <p className="text-gray-600 mb-4">This usually takes 1-2 minutes</p>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div className="bg-blue-600 h-4 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-sm text-gray-500">{progress}% complete</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`h-1 w-32 ${
                    step > s ? 'bg-blue-600' : 'bg-gray-200'
                  }`}></div>}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Select Video Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {VIDEO_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => { setVideoType(type.id); setStep(2); }}
                      className={`p-4 border-2 rounded-lg text-left hover:border-blue-500 transition ${
                        videoType === type.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <h3 className="font-bold text-lg">{type.name}</h3>
                      <p className="text-sm text-gray-600">{type.description}</p>
                      <span className="text-xs text-blue-600 font-semibold">{type.duration}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Select Images (3-10)</h2>
                <p className="text-sm text-gray-600 mb-4">Selected: {selectedImages.length}/10</p>
                
                {selectedImages.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Selected Order (drag to reorder):</h3>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="selected" direction="horizontal">
                        {(provided) => (
                          <div className="flex gap-2 overflow-x-auto pb-2" {...provided.droppableProps} ref={provided.innerRef}>
                            {selectedImages.map((imgId, index) => (
                              <Draggable key={imgId} draggableId={imgId} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="relative flex-shrink-0"
                                  >
                                    <img
                                      src={`https://ik.imagekit.io/cuizrvzly/church_navigator/tr:w-200,h-150/${imgId}`}
                                      alt="Selected"
                                      className="w-32 h-24 object-cover rounded border-2 border-blue-500"
                                    />
                                    <div className="absolute top-1 left-1 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                      {index + 1}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {galleryImages.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => handleImageToggle(img.id)}
                      className={`cursor-pointer relative ${
                        selectedImages.includes(img.id) ? 'ring-4 ring-blue-500' : ''
                      }`}
                    >
                      <img
                        src={`https://ik.imagekit.io/cuizrvzly/church_navigator/tr:w-300,h-200/${img.id}`}
                        alt="Gallery"
                        className="w-full h-32 object-cover rounded"
                      />
                      {selectedImages.includes(img.id) && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={selectedImages.length < 3}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Choose Music Style</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {MUSIC_STYLES.map((music) => (
                    <button
                      key={music.id}
                      onClick={() => setMusicStyle(music.id)}
                      className={`p-4 border-2 rounded-lg text-left hover:border-blue-500 transition ${
                        musicStyle === music.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <h3 className="font-bold">{music.name}</h3>
                      <p className="text-sm text-gray-600">{music.description}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                    Back
                  </button>
                  <button
                    onClick={generateVideo}
                    disabled={!musicStyle || loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Starting...' : 'Generate Video'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Your Videos</h2>
            {generatedVideos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No videos yet. Generate your first video above!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedVideos.map((video) => (
                  <div key={video.job_id} className="border rounded-lg p-4">
                    <video
                      src={video.video_url}
                      controls
                      className="w-full rounded mb-2"
                    />
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{VIDEO_TYPES.find(t => t.id === video.video_type)?.name}</p>
                        <p className="text-xs text-gray-500">{new Date(video.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={video.video_url}
                          download
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Download
                        </a>
                        <button
                          onClick={() => deleteVideo(video.job_id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}