import { createFileRoute } from "@tanstack/react-router";
import { LuoWatch } from "@/components/luo/LuoWatch";
import { restGetTitle } from "@/lib/luo-rest";

export const Route = createFileRoute("/luganda/$id")({
  // Fetched server-side so shared links unfurl with the real poster and plot.
  loader: ({ params }) =>
    Promise.race([
      restGetTitle(params.id).catch(() => null),
      new Promise<null>((r) => setTimeout(() => r(null), 2500)),
    ]),
  head: ({ params, loaderData }) => {
    const name = loaderData?.title ?? "Luganda Translated Movie";
    const title = `${name} in Luganda — Watch free on LUOFILM.SITE`;
    const description =
      loaderData?.description?.slice(0, 155) ??
      `Watch ${name} translated in Luganda, free and in HD, on LUOFILM.SITE.`;
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "video.movie" },
      { property: "og:site_name", content: "LUOFILM.SITE" },
      { property: "og:url", content: `/luganda/${params.id}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (loaderData?.poster?.startsWith("https://")) {
      meta.push({ property: "og:image", content: loaderData.poster });
      meta.push({ property: "og:image:alt", content: `${name} poster` });
      meta.push({ name: "twitter:image", content: loaderData.poster });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: `/luganda/${params.id}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Movie",
            name: `${name} (Luganda translation)`,
            description,
            inLanguage: "lg",
            ...(loaderData?.poster ? { image: loaderData.poster } : {}),
          }),
        },
      ],
    };
  },
  component: () => <LuoWatch id={Route.useParams().id} language="luganda" />,
});
