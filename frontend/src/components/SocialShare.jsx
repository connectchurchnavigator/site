import React from 'react';

const SocialShare = ({ url, title }) => {
  const shareUrl = url || window.location.href;
  const shareTitle = title || 'ChurchNavigator';
  return (
    <div style={{display:'flex',gap:'8px'}}>
      <a href={`https://wa.me/?text=${encodeURIComponent(shareTitle+' '+shareUrl)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
    </div>
  );
};

export default SocialShare;
