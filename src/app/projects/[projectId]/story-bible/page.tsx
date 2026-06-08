import { JsonDocumentClient } from "@/components/project/JsonDocumentClient";

export default function StoryBiblePage() {
  return <JsonDocumentClient title="Story Bible" endpoint="story-bible" generateEndpoint="story-bible/generate" rootKey="storyBible" />;
}

