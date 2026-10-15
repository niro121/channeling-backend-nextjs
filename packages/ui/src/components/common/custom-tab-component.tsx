"use client"

import React from "react"
import { createContext, useContext } from "react"
import {
  Card,
  CardContent,
} from "../ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"

type ActionTabDialogProps = {
  open: boolean
  setOpen: (value: boolean) => void
  title?: string
  width?: string
  children: React.ReactNode
  tabTitleOne: string
  tabTitleTwo: string
  tabOneContent: React.ReactNode
  tabTwoContent: React.ReactNode
}

interface TabDialogContextTypes {
  setTabDialogOpen: (value: boolean) => void;
}

const TabDialogContext = createContext<TabDialogContextTypes | undefined>(undefined);

export const useTabDialog = () => {
  const context = useContext(TabDialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogContext.Provider");
  }
  return context;
};

export default function CustomTabComponent({
  open,
  setOpen,
  title,
  tabTitleOne,
  tabTitleTwo,
  tabOneContent,
  tabTwoContent
}: ActionTabDialogProps) {
  return (
    <TabDialogContext.Provider value={{ setTabDialogOpen: setOpen }}>
      <Dialog open={open} onOpenChange={() => setOpen(!open)}>
        <DialogContent className={`sm:max-w-[800px] rounded-sm`}>
          <Tabs defaultValue={tabTitleOne}>
            <DialogHeader className="border-b pb-6">
              <div className="w-full flex justify-between pe-8">
                <DialogTitle>{title}</DialogTitle>
                <div className="w-[400px]">
                  <TabsList className="ml-auto grid w-full grid-cols-2">
                    <TabsTrigger value={tabTitleOne}>{tabTitleOne}</TabsTrigger>
                    <TabsTrigger value={tabTitleTwo}>{tabTitleTwo}</TabsTrigger>
                  </TabsList>
                </div>
              </div>
            </DialogHeader>
            <div className="pe-8">
              <TabsContent value={tabTitleOne}>
                <Card className="border-none">
                  <CardContent className="space-y-2 p-0">
                    {tabOneContent}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value={tabTitleTwo}>
                <Card className="border-none">
                  <CardContent className="space-y-2 p-0">
                    {tabTwoContent}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </TabDialogContext.Provider>
  )
}
