interface MarkdownRendererProps {
  content: string
  className?: string
  style?: React.CSSProperties
}

export function MarkdownRenderer({ content, className, style }: MarkdownRendererProps) {
  // Simple markdown-like rendering without external dependencies
  const renderContent = (text: string) => {
    // Split by double newlines to create paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim())
    
    return paragraphs.map((paragraph, index) => {
      const trimmedParagraph = paragraph.trim()
      
      // Handle headers (lines starting with #)
      if (trimmedParagraph.startsWith('#')) {
        const headerLevel = trimmedParagraph.match(/^#+/)?.[0].length || 1
        const headerText = trimmedParagraph.replace(/^#+\s*/, '')
        
        const HeaderTag = `h${Math.min(headerLevel, 6)}` as keyof JSX.IntrinsicElements
        return (
          <HeaderTag 
            key={index} 
            style={{ 
              fontWeight: 600, 
              marginBottom: '12px',
              fontSize: headerLevel === 1 ? '18px' : headerLevel === 2 ? '16px' : '14px',
              color: '#111827'
            }}
          >
            {headerText}
          </HeaderTag>
        )
      }
      
      // Handle bullet points
      if (trimmedParagraph.includes('\n-') || trimmedParagraph.includes('\n•') || trimmedParagraph.includes('\n*')) {
        const lines = trimmedParagraph.split('\n')
        const content: JSX.Element[] = []
        let currentList: string[] = []
        
        lines.forEach((line, lineIndex) => {
          const trimmedLine = line.trim()
          if (trimmedLine.match(/^[-•*]\s+/)) {
            // This is a bullet point
            currentList.push(trimmedLine.replace(/^[-•*]\s+/, ''))
          } else if (trimmedLine) {
            // This is regular text
            if (currentList.length > 0) {
              // Flush the current list
              content.push(
                <ul key={`list-${lineIndex}`} style={{ marginBottom: '12px', paddingLeft: '20px' }}>
                  {currentList.map((item, itemIndex) => (
                    <li key={itemIndex} style={{ marginBottom: '4px', color: '#374151', fontSize: '14px', lineHeight: '1.5' }}>
                      {formatInlineText(item)}
                    </li>
                  ))}
                </ul>
              )
              currentList = []
            }
            content.push(
              <p key={`text-${lineIndex}`} style={{ marginBottom: '12px', color: '#374151', fontSize: '14px', lineHeight: '1.5' }}>
                {formatInlineText(trimmedLine)}
              </p>
            )
          }
        })
        
        // Flush any remaining list items
        if (currentList.length > 0) {
          content.push(
            <ul key={`list-final`} style={{ marginBottom: '12px', paddingLeft: '20px' }}>
              {currentList.map((item, itemIndex) => (
                <li key={itemIndex} style={{ marginBottom: '4px', color: '#374151', fontSize: '14px', lineHeight: '1.5' }}>
                  {formatInlineText(item)}
                </li>
              ))}
            </ul>
          )
        }
        
        return <div key={index}>{content}</div>
      }
      
      // Regular paragraph
      return (
        <p 
          key={index} 
          style={{ 
            marginBottom: '12px', 
            color: '#374151', 
            fontSize: '14px', 
            lineHeight: '1.5' 
          }}
        >
          {formatInlineText(trimmedParagraph)}
        </p>
      )
    })
  }
  
  // Handle basic inline formatting (bold, italic)
  const formatInlineText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      } else if (part.startsWith('__') && part.endsWith('__')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      } else if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index}>{part.slice(1, -1)}</em>
      } else if (part.startsWith('_') && part.endsWith('_')) {
        return <em key={index}>{part.slice(1, -1)}</em>
      }
      return part
    })
  }
  
  return (
    <div className={className} style={style}>
      {renderContent(content)}
    </div>
  )
}