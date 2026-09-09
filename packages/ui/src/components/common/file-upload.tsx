"use client"
import { ChangeEventHandler } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ErrorMessage } from 'formik';

interface CustomFormFieldProps {
    id: string,
    placeholder: string,
    value: any,
    onChange: ChangeEventHandler<any>,
    onBlur: ChangeEventHandler<any>,
    labelClassName?: string,
    inputClassName?: string,
    disabled?: boolean,
    multiple: boolean
    allow: string
}

const fileUpload = ({ id, placeholder, labelClassName, multiple, allow }: CustomFormFieldProps) => {
    return (
        <div className='mb-4'>
            <Label htmlFor={id} className={labelClassName || ''}>{placeholder}</Label>
            <Input
                id={id}
                type='file focus-visible:ring-offset-0!'
                multiple={multiple}
                accept={allow}
            />
            <ErrorMessage name={id} component="div" className="invalid-feedback" />
            <div>
                
            </div>
        </div>
    );
};

export default fileUpload;
