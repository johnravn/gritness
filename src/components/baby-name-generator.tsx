import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Language =
  | "english"
  | "norwegian"
  | "german"
  | "french"
  | "spanish"
  | "italian"
  | "polish"
  | "dutch"
  | "portuguese"
  | "russian"
  | "swedish"
  | "greek"
  | "czech"
  | "romanian"
  | "hungarian";
type Gender = "boy" | "girl";

interface NameData {
  [key: string]: {
    boy: string[];
    girl: string[];
  };
}

const nameDatabase: NameData = {
  english: {
    boy: ["John", "Johnny", "Jon", "Jonny"],
    girl: [
      "Joan",
      "Joanna",
      "Johanna",
      "Jane",
      "Janet",
      "Jean",
      "Jeanne",
      "Joanie",
      "Joni",
      "Jana",
      "Johnette",
      "Johnetta",
      "Jone",
      "Johnna",
    ],
  },
  norwegian: {
    boy: ["Jon", "John", "Johan", "Jona"],
    girl: ["Johanne", "Johan", "Jonna", "Jona", "Johnna", "Johnette"],
  },
  german: {
    boy: ["Johann", "Johannes", "Johan"],
    girl: ["Johanna", "Hanna", "Hanne", "Janina", "Jana"],
  },
  french: {
    boy: ["Jean", "Jehan", "Johann"],
    girl: ["Jeanne", "Jeannette", "Jeannine"],
  },
  spanish: {
    boy: ["Juan", "Juán", "Jhon"],
    girl: ["Juana", "Juanita", "Jana", "Janet"],
  },
  italian: {
    boy: ["Giovanni", "Gianni", "Gian"],
    girl: ["Giovanna", "Gianna", "Giana", "Giannina"],
  },
  polish: {
    boy: ["Jan", "Johan"],
    girl: ["Janina", "Jana", "Janka", "Janeczka"],
  },
  dutch: {
    boy: ["Jan", "Johan", "Johannes"],
    girl: ["Johanna", "Janna", "Janne", "Hanna"],
  },
  portuguese: {
    boy: ["João", "Johan", "Jhon"],
    girl: ["Joana", "Joanna", "Jana"],
  },
  russian: {
    boy: ["Иван", "Ivan", "Vanya"],
    girl: ["Иванна", "Ivanna", "Vanya"],
  },
  swedish: {
    boy: ["Johan", "Johannes", "Jan", "Jon"],
    girl: ["Johanna", "Jonna", "Janna", "Hanna"],
  },
  greek: {
    boy: ["Ιωάννης", "Ioannis", "Yannis"],
    girl: ["Ιωάννα", "Ioanna", "Yanna", "Gianna"],
  },
  czech: {
    boy: ["Jan", "Johan"],
    girl: ["Jana", "Janina", "Janka", "Janeczka"],
  },
  romanian: {
    boy: ["Ion", "Ioan", "Ionut"],
    girl: ["Ioana", "Iona", "Ionela"],
  },
  hungarian: {
    boy: ["János", "Jani"],
    girl: ["Janka", "Jana"],
  },
};

const languageNames: Record<Language, string> = {
  english: "English",
  norwegian: "Norwegian",
  german: "German",
  french: "French",
  spanish: "Spanish",
  italian: "Italian",
  polish: "Polish",
  dutch: "Dutch",
  portuguese: "Portuguese",
  russian: "Russian",
  swedish: "Swedish",
  greek: "Greek",
  czech: "Czech",
  romanian: "Romanian",
  hungarian: "Hungarian",
};

const languageFlags: Record<Language, string> = {
  english: "🇬🇧",
  norwegian: "🇳🇴",
  german: "🇩🇪",
  french: "🇫🇷",
  spanish: "🇪🇸",
  italian: "🇮🇹",
  polish: "🇵🇱",
  dutch: "🇳🇱",
  portuguese: "🇵🇹",
  russian: "🇷🇺",
  swedish: "🇸🇪",
  greek: "🇬🇷",
  czech: "🇨🇿",
  romanian: "🇷🇴",
  hungarian: "🇭🇺",
};

function getRandomName(names: string[]): string {
  const randomIndex = Math.floor(Math.random() * names.length);
  return names[randomIndex];
}

interface LanguageSelectProps {
  value: Language | "";
  onChange: (value: Language) => void;
  onClear: () => void;
}

function LanguageSelect({ value, onChange, onClear }: LanguageSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectedLanguage = value
    ? languageNames[value]
    : "Select a language...";
  const selectedFlag = value ? languageFlags[value] : "";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !value && "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          {selectedFlag && <span className="text-lg">{selectedFlag}</span>}
          <span>{selectedLanguage}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 opacity-50 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md">
          <div className="max-h-60 overflow-auto p-1">
            <button
              type="button"
              onClick={() => {
                onClear();
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                !value && "bg-accent text-accent-foreground"
              )}
            >
              <span className="text-muted-foreground">
                Select a language...
              </span>
            </button>
            {(Object.keys(languageNames) as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  onChange(lang);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                  value === lang && "bg-accent text-accent-foreground"
                )}
              >
                <span className="text-lg">{languageFlags[lang]}</span>
                <span>{languageNames[lang]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BabyNameGenerator() {
  const [language, setLanguage] = useState<Language | "">("");
  const [gender, setGender] = useState<Gender | "">("");
  const [generatedName, setGeneratedName] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isFirstGeneration, setIsFirstGeneration] = useState(true);

  const handleGenerate = () => {
    if (!language || !gender) return;

    const names = nameDatabase[language][gender];

    // For first generation, if English or Norwegian and boy, always return "John"
    let selectedName: string;
    if (
      isFirstGeneration &&
      (language === "english" || language === "norwegian") &&
      gender === "boy"
    ) {
      selectedName = "John";
      setIsFirstGeneration(false);
    } else {
      selectedName = getRandomName(names);
      setIsFirstGeneration(false);
    }

    // If there's already a name, fade it out first
    if (generatedName) {
      setIsFadingOut(true);
      // After fade-out completes, show sparkle and fade in new name
      setTimeout(() => {
        setIsFadingOut(false);
        setIsAnimating(true);
        setGeneratedName(selectedName);
        setTimeout(() => setIsAnimating(false), 1000);
      }, 300);
    } else {
      // First generation - just show sparkle animation
      setIsAnimating(true);
      setTimeout(() => {
        setGeneratedName(selectedName);
        setTimeout(() => setIsAnimating(false), 1000);
      }, 300);
    }
  };

  const canGenerate = language && gender;

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Baby Name Generator</h1>
        </div>
        <p className="text-muted-foreground">
          Generate beautiful variants of John for your little one
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Choose Your Preferences</CardTitle>
          <CardDescription>
            Select a language and gender to generate a name suggestion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="language" className="text-sm font-medium">
              Language
            </label>
            <LanguageSelect
              value={language}
              onChange={(lang) => {
                setLanguage(lang);
                setGeneratedName(null);
                setIsFirstGeneration(true);
              }}
              onClear={() => {
                setLanguage("");
                setGeneratedName(null);
                setIsFirstGeneration(true);
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Gender</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={gender === "boy" ? "default" : "outline"}
                onClick={() => {
                  setGender("boy");
                  setGeneratedName(null);
                  setIsFirstGeneration(true);
                }}
                className="flex-1"
              >
                Boy
              </Button>
              <Button
                type="button"
                variant={gender === "girl" ? "default" : "outline"}
                onClick={() => {
                  setGender("girl");
                  setGeneratedName(null);
                  setIsFirstGeneration(true);
                }}
                className="flex-1"
              >
                Girl
              </Button>
            </div>
          </div>

          {generatedName && (
            <div className="text-center py-6 relative">
              <div className="inline-block p-6 rounded-lg border-2 border-primary/20 bg-primary/5 relative overflow-hidden min-w-[280px]">
                {isAnimating && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                    {[...Array(12)].map((_, i) => {
                      const randomX = 20 + Math.random() * 60;
                      const randomY = 20 + Math.random() * 60;
                      const randomDelay = Math.random() * 0.3;
                      const randomDuration = 0.6 + Math.random() * 0.3;
                      return (
                        <div
                          key={i}
                          className="absolute glitter-particle"
                          style={{
                            left: `${randomX}%`,
                            top: `${randomY}%`,
                            animationDelay: `${randomDelay}s`,
                            animationDuration: `${randomDuration}s`,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
                <p
                  className={cn(
                    "text-4xl font-bold text-foreground relative z-10",
                    isFadingOut && "name-fade-out",
                    isAnimating && "opacity-0",
                    !isAnimating && !isFadingOut && "name-fade-in"
                  )}
                >
                  {generatedName}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex-1"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {generatedName ? "Generate Another" : "Generate Name"}
            </Button>
            {generatedName && (
              <Button
                variant="outline"
                onClick={() => {
                  setLanguage("");
                  setGender("");
                  setGeneratedName(null);
                  setIsFirstGeneration(true);
                }}
                className="flex-1"
              >
                Start Over
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
