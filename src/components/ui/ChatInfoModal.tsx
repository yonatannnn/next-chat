import React, { useEffect, useMemo } from 'react';
import { X, User, Calendar, MessageCircle, TrendingUp, Clock, Hash, Type, Award, Zap, Smile, Target, Flame, Star, Trophy, Coffee, Heart, Brain, Activity } from 'lucide-react';
import { Avatar } from './Avatar';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

interface ChatInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    username: string;
    email: string;
    avatar?: string;
  };
  messages: Message[];
  currentUserId: string;
  lastMessageTime?: Date;
}

export const ChatInfoModal: React.FC<ChatInfoModalProps> = ({
  isOpen,
  onClose,
  user,
  messages,
  currentUserId,
  lastMessageTime
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Calculate analytics
  const analytics = useMemo(() => {
    const myMessages = messages.filter(msg => msg.senderId === currentUserId);
    const theirMessages = messages.filter(msg => msg.senderId !== currentUserId);
    
    // Message counts
    const myMessageCount = myMessages.length;
    const theirMessageCount = theirMessages.length;
    const totalMessages = messages.length;
    
    // Word and letter counts
    const myWords = myMessages.reduce((acc, msg) => acc + msg.text.split(' ').length, 0);
    const theirWords = theirMessages.reduce((acc, msg) => acc + msg.text.split(' ').length, 0);
    const myLetters = myMessages.reduce((acc, msg) => acc + msg.text.length, 0);
    const theirLetters = theirMessages.reduce((acc, msg) => acc + msg.text.length, 0);
    
    // Averages
    const myAvgWords = myMessageCount > 0 ? Math.round(myWords / myMessageCount) : 0;
    const theirAvgWords = theirMessageCount > 0 ? Math.round(theirWords / theirMessageCount) : 0;
    const myAvgLetters = myMessageCount > 0 ? Math.round(myLetters / myMessageCount) : 0;
    const theirAvgLetters = theirMessageCount > 0 ? Math.round(theirLetters / theirMessageCount) : 0;
    
    // Conversation streak (days with at least one message)
    const messageDates = messages.map(msg => {
      const date = new Date(msg.timestamp);
      return date.toDateString();
    });
    const uniqueDates = new Set(messageDates);
    const streak = uniqueDates.size;
    
    // Most active day
    const dayCounts: { [key: string]: number } = {};
    messages.forEach(msg => {
      const day = new Date(msg.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const mostActiveDay = Object.entries(dayCounts).reduce((a, b) => dayCounts[a[0]] > dayCounts[b[0]] ? a : b, ['Monday', 0]);
    
    // Longest message
    const longestMessage = messages.reduce((longest, msg) => 
      msg.text.length > longest.length ? msg.text : longest, '');
    
    // Conversation starter (who sent the first message)
    const sortedMessages = [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const firstMessage = sortedMessages[0];
    const conversationStarter = firstMessage?.senderId === currentUserId ? 'You' : user.username;
    
    // Response time analysis
    const responseTimes: number[] = [];
    for (let i = 1; i < sortedMessages.length; i++) {
      const prevMsg = sortedMessages[i - 1];
      const currMsg = sortedMessages[i];
      if (prevMsg.senderId !== currMsg.senderId) {
        const timeDiff = new Date(currMsg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime();
        responseTimes.push(timeDiff);
      }
    }
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((acc, time) => acc + time, 0) / responseTimes.length / (1000 * 60)) // in minutes
      : 0;
    
    // Emoji usage
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const myEmojis = myMessages.reduce((acc, msg) => acc + (msg.text.match(emojiRegex) || []).length, 0);
    const theirEmojis = theirMessages.reduce((acc, msg) => acc + (msg.text.match(emojiRegex) || []).length, 0);
    
    // Message patterns
    const myQuestions = myMessages.filter(msg => msg.text.includes('?')).length;
    const theirQuestions = theirMessages.filter(msg => msg.text.includes('?')).length;
    const myExclamations = myMessages.filter(msg => msg.text.includes('!')).length;
    const theirExclamations = theirMessages.filter(msg => msg.text.includes('!')).length;
    
    // Time-based patterns
    const hourCounts: { [key: number]: number } = {};
    messages.forEach(msg => {
      const hour = new Date(msg.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const mostActiveHour = Object.entries(hourCounts).reduce((a, b) => hourCounts[parseInt(a[0])] > hourCounts[parseInt(b[0])] ? a : b, ['12', 0]);
    
    // Message length distribution
    const shortMessages = messages.filter(msg => msg.text.length < 20).length;
    const mediumMessages = messages.filter(msg => msg.text.length >= 20 && msg.text.length < 100).length;
    const longMessages = messages.filter(msg => msg.text.length >= 100).length;
    
    // Achievements
    const achievements = [];
    if (totalMessages >= 100) achievements.push({ icon: Trophy, text: "Century Club", color: "text-yellow-500" });
    if (streak >= 7) achievements.push({ icon: Flame, text: "Week Warrior", color: "text-orange-500" });
    if (myAvgWords >= 20) achievements.push({ icon: Brain, text: "Word Wizard", color: "text-purple-500" });
    if (myEmojis >= 10) achievements.push({ icon: Smile, text: "Emoji Master", color: "text-pink-500" });
    if (avgResponseTime < 5) achievements.push({ icon: Zap, text: "Speed Demon", color: "text-blue-500" });
    
    // Conversation health score
    const healthScore = Math.min(100, Math.round(
      (Math.min(totalMessages / 10, 10) * 20) + // Message volume
      (Math.min(streak / 7, 10) * 20) + // Consistency
      (Math.min(avgResponseTime / 60, 10) * 20) + // Responsiveness
      (Math.min((myEmojis + theirEmojis) / 5, 10) * 20) + // Engagement
      (Math.min((myQuestions + theirQuestions) / 5, 10) * 20) // Interaction
    ));
    
    return {
      myMessageCount,
      theirMessageCount,
      totalMessages,
      myAvgWords,
      theirAvgWords,
      myAvgLetters,
      theirAvgLetters,
      streak,
      mostActiveDay,
      longestMessage,
      conversationStarter,
      avgResponseTime,
      myEmojis,
      theirEmojis,
      myQuestions,
      theirQuestions,
      myExclamations,
      theirExclamations,
      mostActiveHour,
      shortMessages,
      mediumMessages,
      longMessages,
      achievements,
      healthScore
    };
  }, [messages, currentUserId, user.username]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Chat Info</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[600px] overflow-y-auto">
          {/* User Info */}
          <div className="flex items-center space-x-4 mb-6">
            <Avatar
              src={user.avatar}
              alt={user.username}
              size="lg"
            />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{user.username}</h3>
              <p className="text-gray-500">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Heart size={14} className="text-red-500" />
                <span className="text-sm text-gray-600">Health Score: {analytics.healthScore}/100</span>
              </div>
            </div>
          </div>

          {/* Achievements */}
          {analytics.achievements.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">🏆 Achievements</h4>
              <div className="flex flex-wrap gap-2">
                {analytics.achievements.map((achievement, index) => (
                  <div key={index} className="flex items-center space-x-1 bg-yellow-50 px-3 py-1 rounded-full">
                    <achievement.icon size={14} className={achievement.color} />
                    <span className="text-xs font-medium text-yellow-800">{achievement.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Basic Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <MessageCircle size={20} className="text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Total Messages</p>
                  <p className="text-2xl font-bold text-blue-600">{analytics.totalMessages}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Zap size={20} className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Conversation Streak</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.streak} days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Message Distribution */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Message Distribution</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">You</span>
                </div>
                <span className="text-sm font-medium">{analytics.myMessageCount} messages</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{user.username}</span>
                </div>
                <span className="text-sm font-medium">{analytics.theirMessageCount} messages</span>
              </div>
            </div>
            
            {/* Message Length Distribution */}
            <div className="mt-4">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Message Lengths</h5>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="font-medium text-gray-900">{analytics.shortMessages}</div>
                  <div className="text-gray-500">Short (&lt;20)</div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="font-medium text-gray-900">{analytics.mediumMessages}</div>
                  <div className="text-gray-500">Medium (20-99)</div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="font-medium text-gray-900">{analytics.longMessages}</div>
                  <div className="text-gray-500">Long (100+)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Writing Style Analytics */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Writing Style</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Your Average</p>
                <p className="text-sm font-medium">{analytics.myAvgWords} words/message</p>
                <p className="text-xs text-gray-500">{analytics.myAvgLetters} letters/message</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{user.username}'s Average</p>
                <p className="text-sm font-medium">{analytics.theirAvgWords} words/message</p>
                <p className="text-xs text-gray-500">{analytics.theirAvgLetters} letters/message</p>
              </div>
            </div>
          </div>

          {/* Communication Patterns */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Communication Patterns</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Smile size={16} className="text-purple-600" />
                  <span className="text-xs font-medium text-purple-900">Emoji Usage</span>
                </div>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>You:</span>
                    <span className="font-medium">{analytics.myEmojis}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{user.username}:</span>
                    <span className="font-medium">{analytics.theirEmojis}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Target size={16} className="text-orange-600" />
                  <span className="text-xs font-medium text-orange-900">Questions Asked</span>
                </div>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>You:</span>
                    <span className="font-medium">{analytics.myQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{user.username}:</span>
                    <span className="font-medium">{analytics.theirQuestions}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="bg-red-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity size={16} className="text-red-600" />
                  <span className="text-xs font-medium text-red-900">Excitement Level</span>
                </div>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>You:</span>
                    <span className="font-medium">{analytics.myExclamations} !</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{user.username}:</span>
                    <span className="font-medium">{analytics.theirExclamations} !</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock size={16} className="text-blue-600" />
                  <span className="text-xs font-medium text-blue-900">Response Time</span>
                </div>
                <div className="text-sm">
                  <div className="text-center">
                    <span className="font-medium">{analytics.avgResponseTime} min</span>
                    <div className="text-xs text-gray-500">average</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fun Stats */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Fun Facts</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Award size={16} className="text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Conversation Starter</p>
                  <p className="text-sm text-gray-500">{analytics.conversationStarter} started this chat</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock size={16} className="text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Most Active Day</p>
                  <p className="text-sm text-gray-500">{analytics.mostActiveDay[0]} ({analytics.mostActiveDay[1]} messages)</p>
                </div>
              </div>
              
              
              
              
        
            </div>
          </div>

          {/* Last Message */}
          {lastMessageTime && (
            <div className="flex items-center space-x-3">
              <Calendar size={16} className="text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Last Message</p>
                <p className="text-sm text-gray-500">{formatDate(lastMessageTime)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
