import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (baseUser) => {
    try {
      const { profileService } = await import('../features/profile-settings/api/profileService');
      const profileRes = await profileService.getMyProfile();
      
      const profileData = profileRes.data || profileRes;
      const profile = profileData.profile;
      
      if (profile) {
        const name = profile.full_name || baseUser.user_metadata?.full_name || baseUser.user_metadata?.name || baseUser.email?.split('@')[0] || 'User';
        const mergedUser = {
          ...baseUser,
          name,
          role: profile.current_role || baseUser.user_metadata?.role || 'User',
          current_role: profile.current_role || '',
          target_role: profile.target_role || profile.profile_data?.target_role || '',
          target_domain: profile.target_domain || profile.profile_data?.target_domain || '',
          skills_summary: profile.skills_summary || '',
          experience: profile.profile_data?.user_experience || profile.years_experience || 'Fresh Graduate',
          education: profile.profile_data?.user_education || profile.education_level || '',
          avatar_url: profile.avatar_url,
          profile_data: profile.profile_data || {},
          phone: profile.phone,
          gender: profile.gender,
          bio: profile.bio || profile.summary,
        };
        setUser(mergedUser);
        localStorage.setItem('neokarir_user_profile', JSON.stringify(mergedUser));
        
        if (profile.target_role) {
          setIsNewUser(false);
          localStorage.setItem('neokarir_onboarding_completed', 'true');
          localStorage.setItem('neokarir_has_completed_onboarding_once', 'true');
        }

        return mergedUser;
      }
    } catch (e) {
      console.error("Failed to load user profile from DB", e);
    }
    
    // Fallback mapping if DB profile doesn't exist yet or fails
    const name = baseUser.user_metadata?.full_name || baseUser.user_metadata?.name || baseUser.email?.split('@')[0] || 'User';
    const fallbackUser = {
      ...baseUser,
      name,
      role: baseUser.user_metadata?.role || 'User',
    };
    setUser(fallbackUser);
    localStorage.setItem('neokarir_user_profile', JSON.stringify(fallbackUser));
    return fallbackUser;
  };

  useEffect(() => {
    // Check localStorage for auth state on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('neokarir_auth_token');
      const onboardingCompleted = localStorage.getItem('neokarir_onboarding_completed') === 'true';

      if (token) {
        try {
          const { authService } = await import('../features/auth/api/authService');
          const response = await authService.me();
          
          const responseData = response.data || response;
          if (responseData && responseData.user) {
             setIsAuthenticated(true);
             setIsNewUser(!onboardingCompleted);
             await fetchUserProfile(responseData.user);
          }
        } catch (error) {
          console.error("Failed to fetch user session", error);
          if (error?.response?.status === 401) {
             localStorage.removeItem('neokarir_auth_token');
             setIsAuthenticated(false);
          }
        }
        if (onboardingCompleted) {
          localStorage.setItem('neokarir_has_completed_onboarding_once', 'true');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("User is unauthorized. Cleaning up session and redirecting.");
      localStorage.removeItem('neokarir_auth_token');
      localStorage.removeItem('neokarir_user_profile');
      localStorage.removeItem('neokarir_onboarding_completed');
      setIsAuthenticated(false);
      setIsNewUser(false);
      setUser(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (userData, token, isNew = false) => {
    setIsAuthenticated(true);
    setIsNewUser(isNew);
    
    if (token) {
      localStorage.setItem('neokarir_auth_token', token);
    }
    
    // Set base user immediately
    const mappedName = userData.user_metadata?.full_name || userData.user_metadata?.name || userData.name || userData.email?.split('@')[0] || 'User';
    const baseUser = { ...userData, name: mappedName };
    setUser(baseUser);
    
    // Fetch and merge real profile from DB
    await fetchUserProfile(baseUser);
    
    if (!isNew) {
      localStorage.setItem('neokarir_onboarding_completed', 'true');
      localStorage.setItem('neokarir_has_completed_onboarding_once', 'true');
    }
  };

  const register = (userData, token) => {
    login(userData, token, true);
  };

  const refreshUserProfile = async () => {
    const token = localStorage.getItem('neokarir_auth_token');
    if (!token || !user) return;
    return await fetchUserProfile(user);
  };

  const completeOnboarding = (profileData) => {
    setIsNewUser(false);
    localStorage.setItem('neokarir_onboarding_completed', 'true');
    localStorage.setItem('neokarir_has_completed_onboarding_once', 'true');
    
    if (profileData) {
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser);
      localStorage.setItem('neokarir_user_profile', JSON.stringify(updatedUser));
    }
  };

  const updateProfile = (profileData) => {
    if (profileData) {
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser);
      localStorage.setItem('neokarir_user_profile', JSON.stringify(updatedUser));
    }
  };

  const resetOnboarding = () => {
    setIsNewUser(true);
    localStorage.removeItem('neokarir_onboarding_completed');
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsNewUser(false);
    setUser(null);
    localStorage.removeItem('neokarir_auth_token');
    localStorage.removeItem('neokarir_user_profile');
    localStorage.removeItem('neokarir_onboarding_completed');
    localStorage.removeItem('neokarir_has_completed_onboarding_once');
  };

  const value = {
    isAuthenticated,
    isNewUser,
    user,
    loading,
    login,
    register,
    logout,
    completeOnboarding,
    resetOnboarding,
    updateProfile,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
