import React, { useState } from 'react';
import { Activity } from '../types';
import { Mail, Phone, MessageSquare, Calendar, FileText, Plus } from 'lucide-react';

interface ActivityLogProps {
  activities: Activity[];
  onAddActivity: (act: Omit<Activity, 'id' | 'created_at' | 'lead_id'>) => Promise<void>;
}

const ActivityLog: React.FC<ActivityLogProps> = ({ activities, onAddActivity }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activity_type: 'email' as const,
    direction: 'outbound' as const,
    subject: '',
    body: '',
    done_at: new Date().toISOString().slice(0, 16) // format for datetime-local
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddActivity({
        ...newActivity,
        done_at: new Date(newActivity.done_at).toISOString()
    });
    setIsAdding(false);
    setNewActivity({
        activity_type: 'email',
        direction: 'outbound',
        subject: '',
        body: '',
        done_at: new Date().toISOString().slice(0, 16)
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'call': return <Phone className="w-4 h-4" />;
      case 'linkedin': return <MessageSquare className="w-4 h-4" />;
      case 'meeting': return <Calendar className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Activity Timeline</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
        >
          <Plus className="w-3 h-3" /> Log Activity
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-3 rounded border border-gray-200 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select 
              value={newActivity.activity_type}
              onChange={(e) => setNewActivity({...newActivity, activity_type: e.target.value as any})}
              className="text-sm border rounded p-1"
            >
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
            </select>
            <select 
              value={newActivity.direction}
              onChange={(e) => setNewActivity({...newActivity, direction: e.target.value as any})}
              className="text-sm border rounded p-1"
            >
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
          </div>
          <input 
            type="text" 
            placeholder="Subject / Summary"
            className="w-full text-sm border rounded p-1"
            value={newActivity.subject}
            onChange={e => setNewActivity({...newActivity, subject: e.target.value})}
          />
          <textarea 
            placeholder="Details..."
            className="w-full text-sm border rounded p-1 h-16"
            value={newActivity.body}
            onChange={e => setNewActivity({...newActivity, body: e.target.value})}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAdding(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
            <button type="submit" className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">Save</button>
          </div>
        </form>
      )}

      <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
        {activities.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No activities logged yet.</p>
        ) : (
            activities.map((act) => (
            <div key={act.id} className="relative pl-6 border-l border-gray-200 last:border-0">
                <div className={`absolute -left-2 top-1 w-4 h-4 rounded-full flex items-center justify-center bg-white border ${act.direction === 'inbound' ? 'border-green-500 text-green-600' : 'border-blue-500 text-blue-600'}`}>
                {getIcon(act.activity_type)}
                </div>
                <div className="mb-1">
                    <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-900">{act.subject || act.activity_type}</span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(act.done_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{act.body}</p>
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ActivityLog;