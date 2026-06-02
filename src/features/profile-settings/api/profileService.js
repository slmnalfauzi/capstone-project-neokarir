import api, { USE_MOCK } from '../../../config/api';

/**
 * Profile and Settings API service.
 * Connects profile tabs with mock fallbacks and updates global AuthContext when profiles change.
 */
export const profileService = {
  getMyProfile: async () => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        success: true,
        data: {
          profile: {
            full_name: 'Franz Hermann',
            email: 'hello@example.com',
            phone: '081234567890',
            gender: 'Male',
            current_role: 'Fullstack Engineer',
            target_role: 'Senior Fullstack Engineer',
            target_domain: 'Web Development',
            years_experience: 2,
            avatar_url: null,
            skills_summary: 'React, Node.js, Express, PostgreSQL',
            education_level: 'S1',
            profile_data: {
              owned_skills: ['React', 'Node.js', 'Express', 'PostgreSQL'],
              date_of_birth: '1995-05-15',
              user_experience: '1-3 tahun',
              user_education: 'S1',
            }
          }
        }
      };
    }
    return api.get('/profile/me');
  },

  updateProfile: async (profileData) => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        data: profileData
      };
    }
    return api.put('/profile/me', profileData);
  },

  updatePersonalInfo: async (personalData) => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        user: {
          name: personalData.fullName,
          email: personalData.email,
        },
      };
    }

    return api.put('/profile/me', {
      full_name: personalData.fullName,
      email: personalData.email,
      phone: personalData.phone,
      bio: personalData.bio,
      gender: personalData.gender,
      profile_data: {
        date_of_birth: personalData.dateOfBirth
      }
    });
  },

  updateCareerInfo: async (careerData) => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        user: {
          role: careerData.currentRole,
          experience: careerData.experienceLevel,
        },
      };
    }

    const payload = {};
    if (careerData.currentRole !== undefined) {
      payload.current_role = careerData.currentRole;
    }
    if (careerData.targetRole !== undefined) {
      payload.target_role = careerData.targetRole;
    }
    if (careerData.targetDomain !== undefined) {
      payload.target_domain = careerData.targetDomain;
      payload.profile_data = payload.profile_data || {};
      payload.profile_data.target_domain = careerData.targetDomain;
    }
    if (careerData.experienceLevel !== undefined) {
      payload.profile_data = payload.profile_data || {};
      payload.profile_data.user_experience = careerData.experienceLevel;
      
      let years = 1.0;
      if (careerData.experienceLevel === '< 1 tahun') years = 0.5;
      else if (careerData.experienceLevel === '1-3 tahun') years = 2.0;
      else if (careerData.experienceLevel === '3-5 tahun') years = 4.0;
      else if (careerData.experienceLevel === '> 5 tahun') years = 6.0;
      else if (careerData.experienceLevel === 'Belum ada pengalaman') years = 0.0;
      payload.years_experience = years;
    }
    if (careerData.education !== undefined) {
      payload.education_level = careerData.education;
      payload.profile_data = payload.profile_data || {};
      payload.profile_data.user_education = careerData.education;
    }
    if (careerData.skills !== undefined) {
      payload.skills_summary = careerData.skills.join(', ');
      payload.profile_data = payload.profile_data || {};
      payload.profile_data.owned_skills = careerData.skills;
    }

    return api.put('/profile/me', payload);
  },

  uploadAvatar: async (file) => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        success: true,
        data: {
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        }
      };
    }

    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateSecurity: async (securityData) => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        message: 'Security settings updated successfully',
      };
    }

    return api.post('/auth/change-password', {
      currentPassword: securityData.currentPassword,
      newPassword: securityData.newPassword
    });
  },

  updatePreferences: async (preferencesData) => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        preferences: preferencesData,
      };
    }

    return api.put('/profile/me', {
      profile_data: {
        preferences: preferencesData
      }
    });
  },

  deleteAccount: async (password) => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return { success: true };
    }

    return api.delete('/auth/me', {
      data: { password }
    });
  },
};
