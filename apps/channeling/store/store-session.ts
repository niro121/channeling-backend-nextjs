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

export const useSessionStore = create(
  combine(
    {
      doctor: doctorState
    },
    (set) => ({
      setDoctor: (doctor: Option) => set({ doctor }),

      resetDoctor: () => set({ doctor: doctorState }),

      resetAll: () =>
        set({
          doctor: doctorState
        })
    })
  )
);
