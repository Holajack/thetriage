import { BrainActivity } from '../screens/main/BrainMappingScreen';

export interface Brain3DRegion {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  activity: number;
  color: string;
  subject?: string;
  studyTime: number;
  lastActive: string;
  description: string;
}

// 3D brain region positions (normalized coordinates)
export const BRAIN_3D_REGIONS = [
  {
    id: 'prefrontal_cortex',
    name: 'Prefrontal Cortex',
    position: { x: 0, y: 0.8, z: 0.6 },
    description: 'Executive functions, decision making, and working memory. Critical for planning and problem-solving.',
    defaultColor: '#4CAF50'
  },
  {
    id: 'left_parietal',
    name: 'Left Parietal Lobe',
    position: { x: -0.7, y: 0.3, z: 0.2 },
    description: 'Mathematical processing, spatial reasoning, and logical thinking.',
    defaultColor: '#2196F3'
  },
  {
    id: 'right_parietal', 
    name: 'Right Parietal Lobe',
    position: { x: 0.7, y: 0.3, z: 0.2 },
    description: 'Spatial processing, attention, and visual-spatial reasoning.',
    defaultColor: '#2196F3'
  },
  {
    id: 'left_temporal',
    name: 'Left Temporal Lobe',
    position: { x: -0.9, y: -0.2, z: 0.1 },
    description: 'Language processing, auditory information, and verbal memory.',
    defaultColor: '#FF9800'
  },
  {
    id: 'right_temporal',
    name: 'Right Temporal Lobe', 
    position: { x: 0.9, y: -0.2, z: 0.1 },
    description: 'Musical processing, pattern recognition, and emotional memory.',
    defaultColor: '#9C27B0'
  },
  {
    id: 'occipital_lobe',
    name: 'Occipital Lobe',
    position: { x: 0, y: 0.1, z: -0.9 },
    description: 'Visual processing, image recognition, and visual-spatial skills.',
    defaultColor: '#E91E63'
  },
  {
    id: 'broca_area',
    name: "Broca's Area",
    position: { x: -0.6, y: 0.5, z: 0.4 },
    description: 'Speech production, language formation, and verbal expression.',
    defaultColor: '#F44336'
  },
  {
    id: 'wernicke_area',
    name: "Wernicke's Area",
    position: { x: -0.8, y: 0.1, z: 0.3 },
    description: 'Language comprehension, speech understanding, and semantic processing.',
    defaultColor: '#FF5722'
  },
  {
    id: 'hippocampus_left',
    name: 'Left Hippocampus',
    position: { x: -0.4, y: -0.3, z: 0.0 },
    description: 'Memory formation, learning consolidation, and spatial navigation.',
    defaultColor: '#00BCD4'
  },
  {
    id: 'hippocampus_right',
    name: 'Right Hippocampus',
    position: { x: 0.4, y: -0.3, z: 0.0 },
    description: 'Memory formation, pattern recognition, and emotional memory.',
    defaultColor: '#00BCD4'
  },
  {
    id: 'motor_cortex',
    name: 'Motor Cortex',
    position: { x: 0, y: 0.6, z: 0.2 },
    description: 'Movement control, fine motor skills, and physical coordination.',
    defaultColor: '#795548'
  },
  {
    id: 'anterior_cingulate',
    name: 'Anterior Cingulate',
    position: { x: 0, y: 0.2, z: 0.5 },
    description: 'Attention control, emotion regulation, and decision making.',
    defaultColor: '#607D8B'
  }
];

// Subject to brain region mapping
export const SUBJECT_BRAIN_MAPPING: { [key: string]: string[] } = {
  'Math': ['left_parietal', 'prefrontal_cortex', 'anterior_cingulate'],
  'Mathematics': ['left_parietal', 'prefrontal_cortex', 'anterior_cingulate'],
  'Science': ['occipital_lobe', 'left_parietal', 'prefrontal_cortex'],
  'Physics': ['left_parietal', 'occipital_lobe', 'prefrontal_cortex'],
  'Chemistry': ['occipital_lobe', 'left_parietal', 'hippocampus_left'],
  'Biology': ['occipital_lobe', 'hippocampus_left', 'left_temporal'],
  'History': ['left_temporal', 'hippocampus_left', 'hippocampus_right'],
  'English': ['broca_area', 'wernicke_area', 'left_temporal'],
  'Language': ['broca_area', 'wernicke_area', 'left_temporal'],
  'Art': ['right_parietal', 'occipital_lobe', 'prefrontal_cortex'],
  'Music': ['right_temporal', 'motor_cortex', 'anterior_cingulate'],
  'Computer': ['left_parietal', 'prefrontal_cortex', 'motor_cortex'],
  'CS': ['left_parietal', 'prefrontal_cortex', 'motor_cortex'],
  'Programming': ['left_parietal', 'prefrontal_cortex', 'motor_cortex'],
  'Psychology': ['prefrontal_cortex', 'anterior_cingulate', 'hippocampus_left'],
  'Economics': ['left_parietal', 'prefrontal_cortex', 'anterior_cingulate'],
  'Geography': ['right_parietal', 'hippocampus_right', 'occipital_lobe']
};

// Convert 2D brain activities to 3D regions
export const convertTo3DBrainData = (activities: BrainActivity[]): Brain3DRegion[] => {
  const brain3DRegions: Brain3DRegion[] = [];
  
  // Track which regions have been assigned
  const assignedRegions = new Set<string>();
  
  activities.forEach((activity, index) => {
    // Find the best brain regions for this subject
    const subjectKey = activity.subject;
    const brainRegionIds = SUBJECT_BRAIN_MAPPING[subjectKey] || 
                          SUBJECT_BRAIN_MAPPING[subjectKey.toLowerCase()] ||
                          ['prefrontal_cortex']; // Default fallback
    
    // Use the first available region for this subject
    const regionId = brainRegionIds.find(id => !assignedRegions.has(id)) || brainRegionIds[0];
    const brainRegion = BRAIN_3D_REGIONS.find(r => r.id === regionId);
    
    if (brainRegion) {
      assignedRegions.add(regionId);
      
      brain3DRegions.push({
        id: `activity_${activity.id}_${index}`, // Ensure unique ID
        name: brainRegion.name,
        position: brainRegion.position,
        activity: activity.activity,
        color: activity.color,
        subject: activity.subject,
        studyTime: activity.studyTime,
        lastActive: activity.lastActive,
        description: brainRegion.description
      });
    }
  });
  
  // Fill remaining regions with default low activity
  BRAIN_3D_REGIONS.forEach((region, index) => {
    if (!assignedRegions.has(region.id)) {
      brain3DRegions.push({
        id: `default_${region.id}_${index}`, // Ensure unique ID
        name: region.name,
        position: region.position,
        activity: 0.1 + Math.random() * 0.2, // Low random activity
        color: region.defaultColor,
        studyTime: 0,
        lastActive: 'No recent activity',
        description: region.description
      });
    }
  });
  
  return brain3DRegions;
};

// Generate brain activity visualization data
export const generateBrainVisualizationData = (userData: any): Brain3DRegion[] => {
  if (!userData?.sessions || !userData?.tasks) {
    return BRAIN_3D_REGIONS.map((region, index) => ({
      id: `initial_${region.id}_${index}`, // Ensure unique ID
      name: region.name,
      position: region.position,
      activity: 0.1 + Math.random() * 0.3,
      color: region.defaultColor,
      studyTime: 0,
      lastActive: 'No recent activity',
      description: region.description
    }));
  }

  const sessions = userData.sessions || [];
  const tasks = userData.tasks || [];
  
  // Create subject activity map
  const subjectActivity: { [key: string]: { time: number, lastActive: Date | null, sessions: any[] } } = {};
  
  tasks.forEach((task: any) => {
    if (!task.title) return;
    
    const subject = task.title.split(' ')[0];
    const taskSessions = sessions.filter((session: any) => session.task_id === task.id);
    
    const timeSpent = taskSessions.reduce(
      (sum: number, session: any) => sum + (session.duration_minutes || 0), 0
    );
    
    const latestSession = taskSessions.length > 0
      ? taskSessions.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
      : null;
    
    const lastActive = latestSession?.created_at ? new Date(latestSession.created_at) : null;
    
    if (!subjectActivity[subject]) {
      subjectActivity[subject] = { time: 0, lastActive: null, sessions: [] };
    }
    
    subjectActivity[subject].time += timeSpent;
    subjectActivity[subject].sessions = subjectActivity[subject].sessions.concat(taskSessions);
    
    if (lastActive && (!subjectActivity[subject].lastActive || lastActive > subjectActivity[subject].lastActive)) {
      subjectActivity[subject].lastActive = lastActive;
    }
  });
  
  // Convert to brain regions
  const maxTime = Math.max(...Object.values(subjectActivity).map(s => s.time), 1);
  const assignedRegions = new Set<string>();
  const brain3DRegions: Brain3DRegion[] = [];
  
  Object.entries(subjectActivity).forEach(([subject, data]) => {
    const brainRegionIds = SUBJECT_BRAIN_MAPPING[subject] || 
                          SUBJECT_BRAIN_MAPPING[subject.toLowerCase()] ||
                          ['prefrontal_cortex'];
    
    const regionId = brainRegionIds.find(id => !assignedRegions.has(id)) || brainRegionIds[0];
    const brainRegion = BRAIN_3D_REGIONS.find(r => r.id === regionId);
    
    if (brainRegion) {
      assignedRegions.add(regionId);
      
      const activity = Math.max(0.3, Math.min(0.95, data.time / maxTime));
      
      let lastActiveStr = 'Never';
      if (data.lastActive) {
        const now = new Date();
        const diffMs = now.getTime() - data.lastActive.getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);
        
        if (diffHrs < 1) {
          lastActiveStr = `${Math.round(diffHrs * 60)} minutes ago`;
        } else if (diffHrs < 24) {
          lastActiveStr = `${Math.round(diffHrs)} hours ago`;
        } else {
          lastActiveStr = `${Math.round(diffHrs / 24)} days ago`;
        }
      }
      
      // Generate colors based on activity and subject
      const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#F44336'];
      const colorIndex = Math.floor(Math.abs(subject.charCodeAt(0)) % colors.length);
      
      brain3DRegions.push({
        id: `subject_${regionId}_${Object.keys(subjectActivity).indexOf(subject)}`, // Ensure unique ID
        name: brainRegion.name,
        position: brainRegion.position,
        activity,
        color: colors[colorIndex],
        subject,
        studyTime: data.time,
        lastActive: lastActiveStr,
        description: brainRegion.description
      });
    }
  });
  
  // Fill remaining regions with low activity
  BRAIN_3D_REGIONS.forEach((region, index) => {
    if (!assignedRegions.has(region.id)) {
      brain3DRegions.push({
        id: `unused_${region.id}_${index}`, // Ensure unique ID
        name: region.name,
        position: region.position,
        activity: 0.1 + Math.random() * 0.2,
        color: region.defaultColor,
        studyTime: 0,
        lastActive: 'No recent activity',
        description: region.description
      });
    }
  });
  
  return brain3DRegions;
};