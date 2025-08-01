import { BookOpen } from "lucide-react";

interface FullPageLoaderProps {
  text?: string;
}

export default function FullPageLoader({ text = "Loading..." }: FullPageLoaderProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <BookOpen className="h-8 w-8 animate-pulse mx-auto mb-4" />
        <p>{text}</p>
      </div>
    </div>
  );
}
