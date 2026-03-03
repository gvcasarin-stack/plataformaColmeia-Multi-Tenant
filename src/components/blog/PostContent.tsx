"use client"

interface PostContentProps {
  content: string
}

export default function PostContent({ content }: PostContentProps) {
  return (
    <article className="prose prose-lg prose-slate max-w-none
      prose-headings:font-bold prose-headings:text-slate-800 prose-headings:tracking-tight
      prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b prose-h2:border-slate-200
      prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
      prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-6
      prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
      prose-strong:text-slate-900 prose-strong:font-bold
      prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6
      prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6
      prose-li:text-slate-700 prose-li:my-2
      prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-slate-600 prose-blockquote:bg-blue-50 prose-blockquote:py-4 prose-blockquote:rounded-r-lg
      prose-code:text-blue-600 prose-code:bg-slate-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-['']
      prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:shadow-lg prose-pre:overflow-x-auto
      prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
      prose-hr:border-slate-200 prose-hr:my-12
    ">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  )
}
