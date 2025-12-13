"""Utilities for parsing Jira Rich Text Format to plain text and HTML"""

import json
import logging
import re
from typing import Optional, Union, Dict

logger = logging.getLogger(__name__)

# Track list nesting for proper indentation
_list_depth = 0
_list_type_stack = []  # Track ordered vs unordered lists
_in_code_block = False  # Track if we're inside a code block

# Pattern for old Jira code format: {code:language}...{code}
OLD_JIRA_CODE_PATTERN = re.compile(r'\{code(?::([^}]*))? \}(.*?)\{code\}', re.DOTALL)

# Pattern for Jira-style lists: * for level 1, ** for level 2, *** for level 3, etc.
JIRA_LIST_PATTERN = re.compile(r'^(\*+)\s+(.*)$')


def parse_jira_rich_text(text: Union[str, dict]) -> str:
    """
    Parse Jira Document Format (Rich Text) to plain text.
    Handles both JSON strings and dict objects.
    Also handles old Jira macro format: {code:language}...{code}
    Also handles Jira-style lists: * item, ** sub-item, etc.
    
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
    
    Old Jira macro format:
    {code:java}
System.out.println("Hello");
    {code}
    
    Jira-style lists:
    * Top level item
    ** Second level item
    ** Another second level
    * Back to top level
    
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
                # Not JSON, might be old Jira format or plain text
                # Convert old Jira code format to markdown
                text = _convert_old_jira_code_blocks(text)
                # Convert Jira-style lists to markdown
                text = _convert_jira_style_lists(text)
                return _format_plain_text_with_urls(text)
            
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                logger.debug("Failed to parse text as JSON, might be old format: %s", text[:50])
                # Try old Jira format
                text = _convert_old_jira_code_blocks(text)
                text = _convert_jira_style_lists(text)
                return _format_plain_text_with_urls(text)
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


def _convert_jira_style_lists(text: str) -> str:
    """
    Convert Jira-style lists (* for level 1, ** for level 2, etc.)
    to markdown lists with proper indentation.
    
    Input:
    * Item 1
    ** Sub-item 1.1
    ** Sub-item 1.2
    * Item 2
    
    Output:
    * Item 1
      * Sub-item 1.1
      * Sub-item 1.2
    * Item 2
    
    Args:
        text: Text potentially containing Jira-style lists
        
    Returns:
        Text with converted lists
    """
    if not text or '*' not in text:
        return text
    
    lines = text.split('\n')
    converted_lines = []
    
    for line in lines:
        match = JIRA_LIST_PATTERN.match(line)
        if match:
            asterisks = match.group(1)
            content = match.group(2)
            # Level is number of asterisks
            level = len(asterisks)
            # Convert to markdown: indent by (level-1)*2 spaces
            indent = '  ' * (level - 1)
            # Use * for all levels (markdown)
            converted_lines.append(f'{indent}* {content}')
        else:
            converted_lines.append(line)
    
    return '\n'.join(converted_lines)


def _convert_old_jira_code_blocks(text: str) -> str:
    """
    Convert old Jira macro format {code:language}...{code} to markdown ```language...```
    
    Args:
        text: Text potentially containing old Jira code blocks
        
    Returns:
        Text with converted code blocks
    """
    if not text or '{code' not in text:
        return text
    
    def replace_code_block(match):
        language = match.group(1) or ''
        code_content = match.group(2)
        # Trim code content
        code_content = code_content.strip()
        return f'```{language}\n{code_content}\n```'
    
    # Replace all {code:language}...{code} patterns
    result = OLD_JIRA_CODE_PATTERN.sub(replace_code_block, text)
    return result


def _format_plain_text_with_urls(text: str) -> str:
    """
    Format plain text by detecting and preserving URLs.
    Detects common URL patterns like [https://...] or bare URLs.
    
    Args:
        text: Plain text that may contain URLs
        
    Returns:
        Formatted text
    """
    if not text:
        return ""
    
    # Already well-formatted, just return
    return text


def _get_list_prefix(list_type: str, index: int) -> str:
    """
    Get the appropriate prefix for list items.
    
    Args:
        list_type: 'bulletList' or 'orderedList'
        index: Item index (for ordered lists)
        
    Returns:
        Prefix string with indentation
    """
    global _list_depth
    # Indentation based on depth
    indent = '  ' * _list_depth
    
    if list_type == 'orderedList':
        # Use numbers for ordered lists
        return f"{indent}{index}. "
    else:
        # Use bullets for unordered lists, varying by depth
        bullets = ['\u2022', '\u25e6', '\u25aa']  # Different bullets for different depths
        bullet = bullets[_list_depth % len(bullets)]
        return f"{indent}{bullet} "


def _extract_code_block_language(attrs: Optional[dict]) -> str:
    """
    Extract language from code block attributes.
    
    Args:
        attrs: Code block attributes dict
        
    Returns:
        Language name or empty string
    """
    if not attrs or not isinstance(attrs, dict):
        return ""
    
    # Try common attribute names
    language = attrs.get('language', '')
    if not language:
        language = attrs.get('lang', '')
    if not language:
        language = attrs.get('class', '')
        # Remove 'language-' prefix if present
        if language.startswith('language-'):
            language = language[9:]
    
    return language.lower() if language else ""


def _extract_text_from_jira_doc(doc: dict) -> str:
    """
    Recursively extract text from Jira document structure.
    
    Args:
        doc: Jira document dict
        
    Returns:
        Extracted plain text
    """
    global _list_depth, _list_type_stack, _in_code_block
    
    # Reset depth at start
    _list_depth = 0
    _list_type_stack = []
    _in_code_block = False
    
    texts = []
    
    def extract_content(content, parent_list_type=None, item_index=0):
        """Recursively extract text from content array"""
        global _list_depth, _list_type_stack, _in_code_block
        
        if not isinstance(content, list):
            return
        
        ordered_item_index = 1  # Counter for ordered list items
        
        for idx, item in enumerate(content):
            if not isinstance(item, dict):
                continue
            
            item_type = item.get('type')
            
            # Extract text nodes with formatting marks
            if item_type == 'text':
                text_content = item.get('text', '')
                if text_content:
                    # Check for text formatting (bold, italic, code, etc.)
                    marks = item.get('marks', [])
                    formatted_text = _apply_text_formatting(text_content, marks)
                    texts.append(formatted_text)
            
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
            
            # Handle bullet lists
            elif item_type == 'bulletList':
                if texts and texts[-1] != '\n':
                    texts.append('\n')
                _list_depth += 1
                _list_type_stack.append('bulletList')
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content, 'bulletList')
                _list_type_stack.pop()
                _list_depth -= 1
                # Add line break after list
                if texts and texts[-1] != '\n':
                    texts.append('\n')
            
            # Handle ordered lists
            elif item_type == 'orderedList':
                if texts and texts[-1] != '\n':
                    texts.append('\n')
                _list_depth += 1
                _list_type_stack.append('orderedList')
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content, 'orderedList')
                _list_type_stack.pop()
                _list_depth -= 1
                # Add line break after list
                if texts and texts[-1] != '\n':
                    texts.append('\n')
            
            # Handle list items
            elif item_type == 'listItem':
                # Add line break before list item if needed
                if texts and texts[-1] != '\n':
                    texts.append('\n')
                
                # Get appropriate prefix based on parent list type
                if parent_list_type == 'orderedList':
                    prefix = _get_list_prefix('orderedList', ordered_item_index)
                    ordered_item_index += 1
                else:
                    prefix = _get_list_prefix('bulletList', 0)
                
                texts.append(prefix)
                
                # Process list item content
                nested_content = item.get('content', [])
                if nested_content:
                    # Collect text from nested content
                    item_texts = []
                    for nested_item in nested_content:
                        if not isinstance(nested_item, dict):
                            continue
                        
                        nested_type = nested_item.get('type')
                        
                        # Handle nested lists
                        if nested_type in ('bulletList', 'orderedList'):
                            # Flush current item
                            if item_texts and item_texts[-1] != '\n':
                                texts.extend(item_texts)
                                texts.append('\n')
                                item_texts = []
                            
                            # Process nested list
                            _list_depth += 1
                            _list_type_stack.append(nested_type)
                            nested_content_of_list = nested_item.get('content', [])
                            if nested_content_of_list:
                                extract_content(nested_content_of_list, nested_type)
                            _list_type_stack.pop()
                            _list_depth -= 1
                        else:
                            # Regular content in list item
                            if nested_type == 'text':
                                text_content = nested_item.get('text', '')
                                if text_content:
                                    marks = nested_item.get('marks', [])
                                    formatted_text = _apply_text_formatting(text_content, marks)
                                    item_texts.append(formatted_text)
                            elif nested_type == 'hardBreak':
                                item_texts.append('\n')
                            elif nested_type == 'paragraph':
                                p_content = nested_item.get('content', [])
                                for p_item in p_content:
                                    if not isinstance(p_item, dict):
                                        continue
                                    if p_item.get('type') == 'text':
                                        text_content = p_item.get('text', '')
                                        if text_content:
                                            marks = p_item.get('marks', [])
                                            formatted_text = _apply_text_formatting(text_content, marks)
                                            item_texts.append(formatted_text)
                    
                    texts.extend(item_texts)
            
            # Handle code blocks - ENHANCED
            elif item_type == 'codeBlock':
                if texts and texts[-1] != '\n':
                    texts.append('\n')
                
                # Extract language if specified
                attrs = item.get('attrs', {})
                language = _extract_code_block_language(attrs)
                
                # Add code block markers with language
                texts.append(f'```{language}\n')
                
                _in_code_block = True
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content)
                _in_code_block = False
                
                # Ensure newline before closing marker
                if texts and texts[-1] != '\n':
                    texts.append('\n')
                texts.append('```\n')
            
            # Handle inline code
            elif item_type == 'inlineCode':
                text_content = item.get('text', '')
                if text_content:
                    texts.append(f'`{text_content}`')
            
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
                texts.append('> ')
                nested_content = item.get('content', [])
                if nested_content:
                    extract_content(nested_content)
                if texts and texts[-1] != '\n':
                    texts.append('\n')
            
            # Handle mentions
            elif item_type == 'mention':
                mention_text = item.get('attrs', {}).get('text', '@user')
                texts.append(mention_text)
            
            # Handle links - IMPROVED
            elif item_type == 'link':
                href = item.get('attrs', {}).get('href', '')
                nested_content = item.get('content', [])
                
                # Extract link text from nested content
                link_text = ''
                if nested_content:
                    # Temporarily collect nested content to get link text
                    temp_texts = []
                    old_texts = texts
                    texts = temp_texts
                    extract_content(nested_content)
                    link_text = ''.join(texts).strip()
                    texts = old_texts
                
                # Format as [link text](url) if both exist
                if href:
                    if link_text and link_text != href:
                        # Link with custom text: [Text](URL)
                        texts.append(f'[{link_text}]({href})')
                    else:
                        # Just URL
                        texts.append(href)
            
            # Handle horizontal rule
            elif item_type == 'rule':
                texts.append('\n---\n')
            
            # Handle emoji and other elements
            elif item_type == 'emoji':
                emoji_text = item.get('attrs', {}).get('shortName', '')
                if emoji_text:
                    texts.append(emoji_text)
            
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
    # Clean up multiple consecutive newlines (max 2)
    while '\n\n\n' in result:
        result = result.replace('\n\n\n', '\n\n')
    # Remove trailing spaces on lines
    result = '\n'.join(line.rstrip() for line in result.split('\n'))
    # Strip leading/trailing whitespace
    result = result.strip()
    
    return result


def _apply_text_formatting(text: str, marks: list) -> str:
    """
    Apply text formatting based on Jira marks.
    
    Args:
        text: Original text
        marks: List of formatting marks (bold, italic, code, etc.)
        
    Returns:
        Formatted text
    """
    if not marks:
        return text
    
    result = text
    
    for mark in marks:
        if not isinstance(mark, dict):
            continue
        
        mark_type = mark.get('type')
        
        if mark_type == 'bold':
            result = f'**{result}**'
        elif mark_type == 'italic':
            result = f'*{result}*'
        elif mark_type == 'code':
            result = f'`{result}`'
        elif mark_type == 'strike':
            result = f'~~{result}~~'
        elif mark_type == 'underline':
            result = f'__{result}__'
        elif mark_type == 'em':
            result = f'*{result}*'
        elif mark_type == 'strong':
            result = f'**{result}**'
    
    return result


def parse_jira_description(description: Optional[str]) -> str:
    """
    Parse Jira description field (handles both rich text and plain text).
    Also handles old Jira macro format {code:language}...{code}
    Also handles Jira-style lists (* item, ** sub-item, etc.)
    
    Args:
        description: Description from Jira API
        
    Returns:
        Clean plain text description with preserved formatting, lists, and code blocks
    """
    if not description:
        return ""
    
    # Try to parse as Jira rich text (also handles old format and lists)
    result = parse_jira_rich_text(description)
    
    # Fallback: if parsing returned empty or looks wrong, return original
    if not result and description:
        return description
    
    return result
