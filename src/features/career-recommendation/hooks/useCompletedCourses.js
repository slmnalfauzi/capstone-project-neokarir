import { useState, useEffect } from 'react';
import { careerService } from '../api/careerService';
import { useToast } from '../../../contexts/ToastContext';

export const useCompletedCourses = (userEmail) => {
  const [completedCourses, setCompletedCourses] = useState([]);
  const { success: toastSuccess, error: toastError } = useToast();

  const normalizeCourseId = (value) => (value || '').toString().trim().toLowerCase();
  const isCompletedCourse = (courseId, completedCourseIds = []) => {
    const normalizedCourseId = normalizeCourseId(courseId);
    if (!normalizedCourseId || !Array.isArray(completedCourseIds)) return false;

    return completedCourseIds.some((completedCourseId) => {
      const normalizedCompletedCourseId = normalizeCourseId(completedCourseId);
      return normalizedCompletedCourseId === normalizedCourseId
        || normalizedCourseId.endsWith(`-${normalizedCompletedCourseId}`)
        || normalizedCompletedCourseId.endsWith(`-${normalizedCourseId}`);
    });
  };

  // Load completed courses on mount/email change
  useEffect(() => {
    const fetchCourses = async () => {
      if (userEmail) {
        try {
          const list = await careerService.getCompletedCourses(userEmail);
          setCompletedCourses(list);
        } catch (e) {
          console.error("Error loading completed courses", e);
        }
      } else {
        setCompletedCourses([]);
      }
    };
    
    fetchCourses();
  }, [userEmail]);

  // Save completed courses via service when changed
  const toggleCourse = async (courseId) => {
    if (!userEmail) return;
    
    const wasCompleted = isCompletedCourse(courseId, completedCourses);
    
    try {
      const updated = await careerService.toggleCourse(userEmail, courseId);
      setCompletedCourses(updated);
      
      if (!wasCompleted) {
        toastSuccess('Selamat! Anda telah menandai modul ini sebagai selesai.');
      } else {
        toastSuccess('Modul ditandai kembali sebagai belum selesai.');
      }
    } catch (e) {
      toastError('Gagal memperbarui status penyelesaian modul.');
    }
  };

  return {
    completedCourses,
    toggleCourse
  };
};
