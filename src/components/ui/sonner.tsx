import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={5000}
      mobileOffset={{ left: 20, right: 20, bottom: "calc(70px + env(safe-area-inset-bottom))" }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-foreground group-[.toaster]:border-0 group-[.toaster]:rounded-lg group-[.toaster]:shadow-md group-[.toaster]:min-h-16 group-[.toaster]:p-0 group-[.toaster]:pl-[18px] group-[.toaster]:pr-2 group-[.toaster]:text-body data-[type=warning]:!shadow-[0_0_0_1px_#6b4f27] data-[type=warning]:!text-warning",
          description: "group-[.toast]:text-note group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:!bg-transparent group-[.toast]:text-foreground group-[.toast]:font-normal group-[.toast]:px-4 group-[.toast]:flex-1 group-[.toast]:border-l group-[.toast]:border-border",
          cancelButton:
            "group-[.toast]:!bg-transparent group-[.toast]:text-primary-hover group-[.toast]:font-medium group-[.toast]:px-4 group-[.toast]:flex-1 group-data-[type=warning]:!text-muted-foreground",
        },
        actionButtonStyle: {
          height: "auto",
          minHeight: "60px",
          fontSize: "19px",
          fontWeight: 400,
        },
        cancelButtonStyle: {
          height: "auto",
          minHeight: "60px",
          fontSize: "19px",
          fontWeight: 500,
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
