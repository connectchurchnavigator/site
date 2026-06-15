import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const SocialTab = ({ churchSlug }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('instagram');

  useEffect(() => {
    fetchPosts();
  }, [churchSlug]);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/social/posts/${churchSlug}`);
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Error fetching social posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const instagramPosts = posts.filter(p => p.platform === 'instagram').slice(0, 9);
  const facebookPosts = posts.filter(p => p.platform === 'facebook').slice(0, 6);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (instagramPosts.length === 0 && facebookPosts.length === 0) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="flex space-x-4 mb-6 border-b">
        {instagramPosts.length > 0 && (
          <button
            onClick={() => setActiveTab('instagram')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'instagram'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Instagram ({instagramPosts.length})
          </button>
        )}
        {facebookPosts.length > 0 && (
          <button
            onClick={() => setActiveTab('facebook')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'facebook'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Facebook ({facebookPosts.length})
          </button>
        )}
      </div>

      {activeTab === 'instagram' && instagramPosts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {instagramPosts.map((post) => (
            <a
              key={post.post_id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
            >
              <img
                src={post.image_url}
                alt={post.caption || 'Instagram post'}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 text-white text-sm flex space-x-4">
                  <span>❤️ {post.likes_count}</span>
                  <span>💬 {post.comments_count}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {activeTab === 'facebook' && facebookPosts.length > 0 && (
        <div className="space-y-6">
          {facebookPosts.map((post) => (
            <a
              key={post.post_id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
            >
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="Facebook post"
                  className="w-full h-64 object-cover"
                />
              )}
              <div className="p-4">
                {post.caption && (
                  <p className="text-gray-800 mb-3 line-clamp-3">{post.caption}</p>
                )}
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <span>👍 {post.likes_count}</span>
                  <span>💬 {post.comments_count}</span>
                  <span>•</span>
                  <span>{new Date(post.posted_at).toLocaleDateString()}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialTab;