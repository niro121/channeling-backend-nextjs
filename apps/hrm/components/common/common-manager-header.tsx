import {BackButton} from "@archmage/ui"

type CommonManagerHeaderProps = {
  title: string;
  description: string;
  backwordButton?: boolean;
}

export function CommonManagerHeader({ title, description, backwordButton }: CommonManagerHeaderProps) {
  return (
    <div className="flex items-center">
      <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-base text-gray-500">{description}</p>
      </div>
      
      {backwordButton && (
        <BackButton className="ml-auto" />
      )}
    </div>
  );
}