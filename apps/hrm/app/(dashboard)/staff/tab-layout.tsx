'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent
} from '@archmage/ui';
import { BriefcaseIcon, FileTextIcon, UserIcon } from 'lucide-react';
import { CustomFormSubmitBtns } from '@/components/custom/custom-form-submit-btns';
import FormGeneral, { type GeneralFormActions } from './form-general';
import FormHrDetail, { type HrDetailFormActions } from './form-hr-detail';
import FormEmployment, { type EmploymentFormActions } from './form-employment';
import SectionAdditionalDetailContent from './section-additional-detail-content';
import type { StaffRecord, StaffWithAuthUsers } from '@/types/staff';

type TabLayoutProps = {
  staff?: StaffRecord | StaffWithAuthUsers | null;
  staffId?: string;
  isEditPage?: boolean;
};

export default function TabLayout({
  staff,
  staffId,
  isEditPage = false
}: TabLayoutProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [generalActions, setGeneralActions] = useState<GeneralFormActions | null>(null);
  const [hrDetailActions, setHrDetailActions] = useState<HrDetailFormActions | null>(null);
  const [employmentActions, setEmploymentActions] =
    useState<EmploymentFormActions | null>(null);

  const handleRegisterGeneralActions = useCallback((actions: GeneralFormActions) => {
    setGeneralActions(actions);
  }, []);

  const handleRegisterHrDetailActions = useCallback((actions: HrDetailFormActions) => {
    setHrDetailActions(actions);
  }, []);

  const handleRegisterEmploymentActions = useCallback(
    (actions: EmploymentFormActions) => {
      setEmploymentActions(actions);
    },
    []
  );

  const handleSave = (saveAndClose: boolean) => {
    if (activeTab === 'additional-details') return;
    if (activeTab === 'hr-details') {
      hrDetailActions?.submit(saveAndClose);
      return;
    }
    if (activeTab === 'employment') {
      employmentActions?.submit(saveAndClose);
      return;
    }
    generalActions?.submit(saveAndClose);
  };

  const saveFirstMessage = (
    <Card>
      <CardContent className="py-8 text-sm text-muted-foreground">
        Save the general information first to enable this tab for this staff member.
      </CardContent>
    </Card>
  );

  const hrDetailsForm =
    isEditPage && staffId && staff ? (
      <FormHrDetail
        staff={staff}
        staffId={staffId}
        onRegisterActions={handleRegisterHrDetailActions}
        onLoadingChange={setLoading}
      />
    ) : (
      saveFirstMessage
    );

  const employmentForm =
    isEditPage && staffId && staff ? (
      <FormEmployment
        staff={staff}
        staffId={staffId}
        onRegisterActions={handleRegisterEmploymentActions}
        onLoadingChange={setLoading}
      />
    ) : (
      saveFirstMessage
    );

  const additionalDetailsForm =
    isEditPage && staffId && staff ? (
      <SectionAdditionalDetailContent staff={staff as StaffWithAuthUsers} />
    ) : (
      saveFirstMessage
    );

  const isReadOnlyTab = activeTab === 'additional-details';

  const TABS_LIST = [
    {
      label: 'General',
      value: 'general',
      icon: <UserIcon className="w-4 h-4" />,
      form: (
        <FormGeneral
          staff={staff}
          staffId={staffId}
          isEditPage={isEditPage}
          onRegisterActions={handleRegisterGeneralActions}
          onLoadingChange={setLoading}
        />
      )
    },
    {
      label: 'HR Details',
      value: 'hr-details',
      icon: <BriefcaseIcon className="w-4 h-4" />,
      form: hrDetailsForm
    },
    {
      label: 'Employment',
      value: 'employment',
      icon: <BriefcaseIcon className="w-4 h-4" />,
      form: employmentForm
    },
    {
      label: 'Additional Details',
      value: 'additional-details',
      icon: <FileTextIcon className="w-4 h-4" />,
      form: additionalDetailsForm
    }
  ];

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue={TABS_LIST[0].value}
        className="w-full space-y-6!"
      >
        <TabsList className="w-full justify-start gap-5 bg-secondary">
          {TABS_LIST.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:text-primary text-base"
            >
              <div className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS_LIST.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.form}
          </TabsContent>
        ))}
      </Tabs>
      <Card className="flex items-center justify-end gap-2 p-6">
        <CustomFormSubmitBtns
          loading={loading}
          onCancel={() => router.push('/staff')}
          onSave={() => handleSave(false)}
          onSaveAndClose={() => handleSave(true)}
          showSave={!isReadOnlyTab}
        />
      </Card>
    </div>
  );
}
