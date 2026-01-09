import { Label } from "@radix-ui/react-dropdown-menu"
import React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { ErrorMessage } from "formik"
import { Spinner } from "../icons"
//import { Spinner } from "../icons"

interface CustomSelectFieldProps {
  id: string
  placeholder: string
  value: any
  onChange: (value: string) => void
  //   labelClassName?: string
  //   inputClassName?: string
  disabled?: boolean
  required: boolean
  options: any[]
  styleClasses?: {
    parentDiv: string
    labelClassName: string
    inputClassName: string
  }
  loading?: boolean,
  emptyString?: string,

}

const CustomSelectField = ({
  id,
  placeholder,
  value,
  onChange,
  //   labelClassName,
  //   inputClassName,
  disabled = false,
  required,
  options,
  styleClasses,
  loading = false,
  //emptyString
}: CustomSelectFieldProps) => {
  return (
    <div className={styleClasses?.parentDiv}>
      <Label className={styleClasses?.labelClassName}>
        {placeholder}
        {required && <span className="text-red-600"> *</span>}
      </Label>
      <div className={styleClasses?.inputClassName}>
        {
          loading ?
            <div className="flex items-center justify-center">
              <Spinner />
            </div>
            :
            <Select
              name={id}
              onValueChange={onChange}
              value={value}
              disabled={disabled}
            >
              <SelectTrigger className="select-span focus-visible:ring-offset-0! focus:ring-offset-0!">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent className="overflow-auto! max-h-80">
                {options.map((item) => (
                  <SelectItem value={item.id} key={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        }
        <ErrorMessage
          name={id}
          component="div"
          className="invalid-feedback text-red-600 text-sm whitespace-nowrap pt-1 sm:pt-0"
        />
      </div>
    </div>
  )
}

export default CustomSelectField
