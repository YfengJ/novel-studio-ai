import { JsonDocumentClient } from "@/components/project/JsonDocumentClient";

export default function StyleBiblePage() {
  return <JsonDocumentClient title="Style Bible" endpoint="style-bible" generateEndpoint="style-bible/generate" rootKey="styleBible" />;
}

