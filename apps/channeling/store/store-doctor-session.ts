import { create } from 'zustand';
import { combine } from 'zustand/middleware';

type Option = {
  id: string;
  name: string;
};

const doctorState: Option = {
  id: '__all__',
  name: 'Select Doctor'
};

const institutionState: Option = {
  id: '0',
  name: 'Ruhunu Hospital (Pvt) Ltd  (RH)'
};

export const useDoctorSessionStore = create(
  combine(
    {
      doctor: doctorState,
      institution: institutionState
    },
    (set) => ({
      setDoctor: (doctor: Option) => set({ doctor }),

      setInstitution: (institution: Option) => set({ institution }),

      resetDoctor: () => set({ doctor: doctorState }),

      resetInstitution: () => set({ institution: institutionState }),

      resetAll: () =>
        set({
          doctor: doctorState,
          institution: institutionState
        })
    })
  )
);
