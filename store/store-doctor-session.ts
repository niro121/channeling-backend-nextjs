import { create } from 'zustand';
import { combine } from 'zustand/middleware';

type Option = {
  id: string;
  name: string;
};

const doctorState: Option = {
  id: '__all__',
  name: 'Select a doctor'
};

const locationState: Option = {
  id: '__all__',
  name: 'Select a location'
};

export const useDoctorSessionStore = create(
  combine(
    {
      doctor: doctorState,
      location: locationState
    },
    (set) => ({
      setDoctor: (doctor: Option) => set({ doctor }),

      setLocation: (location: Option) => set({ location }),

      resetDoctor: () => set({ doctor: doctorState }),

      resetLocation: () => set({ location: locationState }),

      resetAll: () =>
        set({
          doctor: doctorState,
          location: locationState
        })
    })
  )
);
