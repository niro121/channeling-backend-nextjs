import React from 'react';
import SpecialityForm from '../speciality-form';

export default async function AddSpecialityPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6">Add New Speciality</h1>
        <SpecialityForm speciality={null} isEditPage={false} />
      </div>
    </div>
  );
}
