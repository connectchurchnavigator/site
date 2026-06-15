export const getOptimizedImageUrl = (url, width = 800, quality = 85) => {
  if (!url) return '';
  if (!url.includes('ik.imagekit.io')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}tr=w-${width},q-${quality},f-auto`;
};

export const getResponsiveImageSet = (url) => {
  if (!url) return { mobile: '', tablet: '', desktop: '' };
  return {
    mobile: getOptimizedImageUrl(url, 400, 80),
    tablet: getOptimizedImageUrl(url, 800, 85),
    desktop: getOptimizedImageUrl(url, 1200, 90)
  };
};

export const getImageSrcSet = (url) => {
  if (!url) return '';
  const set = getResponsiveImageSet(url);
  return `${set.mobile} 400w, ${set.tablet} 800w, ${set.desktop} 1200w`;
};