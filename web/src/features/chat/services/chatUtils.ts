export const getConversationId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('__');
};

export const buildMessagePreview = (data: {
  text?: string;
  fileUrl?: string | null;
  fileUrls?: string[] | null;
  voiceUrl?: string | null;
  messageType?: string;
}): string => {
  if (data.text && data.text.trim()) return data.text;
  if (data.fileUrls && data.fileUrls.length > 0) {
    return data.fileUrls.length === 1 ? '📷 Photo' : `📷 ${data.fileUrls.length} photos`;
  }
  if (data.fileUrl) return '📷 Photo';
  if (data.voiceUrl) return '🎤 Voice message';
  if (data.messageType === 'system') return 'System message';
  return 'Message';
};
