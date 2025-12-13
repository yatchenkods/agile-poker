"""Utilities for parsing Jira Rich Text Format to plain text and HTML"""

import json
import logging
from typing import Optional, Union

logger = logging.getLogger(__name__)


def parse_jira_rich_text(text: Union[str, dict]) -> str:
    """
    Parse Jira Document Format (Rich Text) to plain text.
    Handles both JSON strings and dict objects.
    
    Jira Document Format example:
    {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Some text"},
                    {"type": "hardBreak"},
                    {"type": "text", "text": "More text"}
                ]
            }
        ]
    }
    
    Args:
        text: Jira rich text as JSON string or dict
        
    Returns:
        Plain text representation
    """
    if not text:
        return ""
    
    try:
        # Parse JSON if it's a string
        if isinstance(text, str):
            # First check if it looks like JSON
            text = text.strip()
            if not text.startswith('{'):
                # Not JSON, return as-is
                return text
            
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                logger.debug("Failed to parse text as JSON, returning as-is: %s", text[:50])
                return text
        else:
            data = text
        
        # Extract plain text from Jira document structure
        if isinstance(data, dict) and data.get('type') == 'doc':
            return _extract_text_from_jira_doc(data)
        else:
            # Not a Jira document, return as string
            return str(text) if not isinstance(text, str) else text
            
    except Exception as e:
        logger.warning("Error parsing Jira rich text: %s", e)
        # Fallback: return original text
        return str(text) if isinstance(text, dict) else text


def _extract_text_from_jira_doc(doc: dict) -> str:
    """
    Recursively extract text from Jira document structure.
    
    Args:
        doc: Jira document dict
        
    Returns:
        Extracted plain text
    """
    texts = []
    
    def extract_content(content):
        """Recursively extract text from content array"""
        if not isinstance(content, list):
            return
        
        for item in content:
            if not isinstance(item, dict):
                continue
            
            item_type = item.get('type')
            
            # Extract text nodes
            if item_type == 'text':
                text_content = item.get('text', '')
                if text_content:
                    texts.append(text_content)
            
            # Handle line breaks
            elif item_type in ('hardBreak', 'softBreak'):
                texts.append('\n')
            
            # Handle different paragraph types
            elif item_type in ('paragraph', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6'):
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content)
                # Add line break after paragraph
                if texts and texts[-1] != '\n':
                    texts.append('\n')
            
            # Handle lists
            elif item_type == 'bulletList' or item_type == 'orderedList':
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content)
                # Add line break after list
                if texts and texts[-1] != '\n':
                    texts.append('\n')
            
            # Handle list items
            elif item_type == 'listItem':
                # Add bullet or number prefix
                if texts and texts[-1] != '\n':
                    texts.append('\n')
                texts.append('• ')  # Use bullet for all lists
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content)
            
            # Handle code blocks
            elif item_type == 'codeBlock':
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content)
                if texts and texts[-1] != '\n':
                    texts.append('\n')
            
            # Handle tables
            elif item_type == 'table':
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content)
                if texts and texts[-1] != '\n':
                    texts.append('\n')
            
            elif item_type in ('tableRow', 'tableCell', 'tableHeader'):
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content)
                # Add separator between cells
                texts.append(' | ')
            
            # Handle blockquotes and other containers
            elif item_type in ('blockquote', 'panel'):
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content)
                if texts and texts[-1] != '\n':
                    texts.append('\n')
            
            # Handle mentions and other inline elements
            elif item_type == 'mention':
                mention_text = item.get('attrs', {}).get('text', '@user')
                texts.append(mention_text)
            
            elif item_type == 'link':
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content)
                href = item.get('attrs', {}).get('href', '')
                if href:
                    texts.append(f" ({href})")
            
            # Default: try to extract nested content
            else:
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content)
    
    # Start extraction from document content
    if 'content' in doc and isinstance(doc['content'], list):
        extract_content(doc['content'])
    
    # Join and clean up text
    result = ''.join(texts)
    # Clean up multiple consecutive newlines
    while '\n\n\n' in result:
        result = result.replace('\n\n\n', '\n\n')
    # Strip leading/trailing whitespace
    result = result.strip()
    
    return result


def parse_jira_description(description: Optional[str]) -> str:
    """
    Parse Jira description field (handles both rich text and plain text).
    
    Args:
        description: Description from Jira API
        
    Returns:
        Clean plain text description
    """
    if not description:
        return ""
    
    # Try to parse as Jira rich text
    result = parse_jira_rich_text(description)
    
    # Fallback: if parsing returned empty or looks wrong, return original
    if not result and description:
        return description
    
    return result
