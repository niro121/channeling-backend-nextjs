import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card
} from '@archmage/ui';
import { BriefcaseIcon, FileTextIcon, UserIcon } from 'lucide-react';
import { CustomFormSubmitBtns } from '@/components/custom/custom-form-submit-btns';
import GeneralForm from './general-form';

const TABS_LIST = [
  {
    label: 'General',
    value: 'general',
    icon: <UserIcon className="w-4 h-4" />,
    form: <GeneralForm />
  },
  {
    label: 'HR Details',
    value: 'hr-details',
    icon: <BriefcaseIcon className="w-4 h-4" />
  },
  {
    label: 'Employment',
    value: 'employment',
    icon: <BriefcaseIcon className="w-4 h-4" />
  },
  {
    label: 'Additional Details',
    value: 'additional-details',
    icon: <FileTextIcon className="w-4 h-4" />
  }
];

export default function TabLayout() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue={TABS_LIST[0].value} className="w-full space-y-6!">
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
        <CustomFormSubmitBtns />
      </Card>
    </div>
  );
}
