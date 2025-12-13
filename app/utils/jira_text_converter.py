"""Jira text format converter

Converts Jira markup formats (Atlassian Document Format, wiki markup) to plain text
while preserving structure and readability.
"""

import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class JiraTextConverter:
    """Convert Jira text formats to readable plain text"""

    @staticmethod
    def convert(text: Optional[str]) -> str:
        """
        Convert Jira formatted text to plain text.
        
        Handles:
        - Atlassian Document Format (ADF) JSON
        - Jira wiki markup
        - Plain text (returns as-is)
        
        Args:
            text: Jira formatted text (ADF, wiki markup, or plain text)
            
        Returns:
            Converted plain text with preserved structure
        """
        if not text:
            return ""
        
        text = text.strip()
        if not text:
            return ""
        
        # Try to parse as ADF (Atlassian Document Format) JSON first
        if text.startswith('{') and text.endswith('}'):
            try:
                return JiraTextConverter._convert_adf(text)
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                logger.debug(f"Failed to parse as ADF: {e}. Trying wiki markup.")
        
        # Try to convert wiki markup
        result = JiraTextConverter._convert_wiki_markup(text)
        return result

    @staticmethod
    def _convert_adf(json_text: str) -> str:
        """
        Convert Atlassian Document Format (ADF) JSON to plain text.
        
        ADF is a structured JSON format used in Jira for rich text content.
        
        Args:
            json_text: JSON string in ADF format
            
        Returns:
            Plain text with preserved structure
        """
        try:
            data = json.loads(json_text)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in ADF: {e}")
            return json_text
        
        if not isinstance(data, dict):
            return str(data)
        
        # Extract content from ADF document
        if 'content' not in data:
            return ""
        
        content = data.get('content', [])
        if not isinstance(content, list):
            return ""
        
        # Convert each content block
        result_lines = []
        for block in content:
            converted = JiraTextConverter._convert_adf_block(block)
            if converted:
                result_lines.append(converted)
        
        return '\n'.join(result_lines).strip()

    @staticmethod
    def _convert_adf_block(block: Dict[str, Any]) -> str:
        """
        Convert a single ADF block to plain text.
        
        Handles: paragraph, heading, bullet_list, ordered_list, code_block, etc.
        
        Args:
            block: Single ADF block dictionary
            
        Returns:
            Converted text for this block
        """
        if not isinstance(block, dict):
            return ""
        
        block_type = block.get('type', '')
        
        # Handle different block types
        if block_type == 'paragraph':
            return JiraTextConverter._convert_adf_inline(block.get('content', []))
        
        elif block_type in ('heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6'):
            level = int(block_type[-1])
            prefix = '#' * level + ' '
            text = JiraTextConverter._convert_adf_inline(block.get('content', []))
            return prefix + text if text else ""
        
        elif block_type == 'bullet_list':
            return JiraTextConverter._convert_adf_list(block.get('content', []), bullet=True)
        
        elif block_type == 'ordered_list':
            return JiraTextConverter._convert_adf_list(block.get('content', []), bullet=False)
        
        elif block_type == 'code_block':
            text = JiraTextConverter._convert_adf_inline(block.get('content', []))
            return f"```\n{text}\n```" if text else ""
        
        elif block_type == 'blockquote':
            text = JiraTextConverter._convert_adf_inline(block.get('content', []))
            return f"> {text}" if text else ""
        
        elif block_type == 'table':
            return JiraTextConverter._convert_adf_table(block)
        
        elif block_type in ('panel', 'info', 'note', 'tip', 'warning'):
            # Panels are informational blocks
            text = JiraTextConverter._convert_adf_inline(block.get('content', []))
            return text
        
        return ""

    @staticmethod
    def _convert_adf_inline(content: List[Dict]) -> str:
        """
        Convert ADF inline content (text with formatting) to plain text.
        
        Handles: text with marks (bold, italic, code, etc.), mentions, links, emojis
        
        Args:
            content: List of inline content blocks
            
        Returns:
            Formatted plain text
        """
        if not isinstance(content, list):
            return ""
        
        result = []
        for item in content:
            if not isinstance(item, dict):
                continue
            
            if item.get('type') == 'text':
                text = item.get('text', '')
                marks = item.get('marks', [])
                
                # Apply text marks (formatting)
                for mark in marks:
                    mark_type = mark.get('type', '')
                    
                    if mark_type == 'strong':
                        text = f"**{text}**"
                    elif mark_type == 'em':
                        text = f"*{text}*"
                    elif mark_type == 'code':
                        text = f"`{text}`"
                    elif mark_type == 'strikethrough':
                        text = f"~~{text}~~"
                    elif mark_type == 'underline':
                        text = f"__{text}__"
                    elif mark_type == 'link':
                        href = mark.get('attrs', {}).get('href', '#')
                        text = f"[{text}]({href})"
                
                result.append(text)
            
            elif item.get('type') == 'mention':
                # Replace mentions with @username format
                attrs = item.get('attrs', {})
                name = attrs.get('text', '@unknown')
                result.append(name)
            
            elif item.get('type') == 'emoji':
                # Include emoji or fallback to text representation
                attrs = item.get('attrs', {})
                text = attrs.get('text', '')
                result.append(text)
            
            elif item.get('type') == 'hardBreak':
                result.append('\n')
            
            elif item.get('type') == 'softBreak':
                result.append(' ')
        
        return ''.join(result).strip()

    @staticmethod
    def _convert_adf_list(content: List[Dict], bullet: bool = True) -> str:
        """
        Convert ADF list items to plain text.
        
        Args:
            content: List of list_item blocks
            bullet: True for bullet list, False for ordered list
            
        Returns:
            Formatted list as plain text
        """
        if not isinstance(content, list):
            return ""
        
        result = []
        for idx, item in enumerate(content, 1):
            if item.get('type') != 'list_item':
                continue
            
            item_content = item.get('content', [])
            text = ''
            
            # Process content in list item
            for block in item_content:
                block_text = JiraTextConverter._convert_adf_block(block)
                if block_text:
                    text += block_text + ' '
            
            text = text.strip()
            if text:
                prefix = '• ' if bullet else f"{idx}. "
                result.append(prefix + text)
        
        return '\n'.join(result)

    @staticmethod
    def _convert_adf_table(block: Dict) -> str:
        """
        Convert ADF table to plain text representation.
        
        Args:
            block: ADF table block
            
        Returns:
            Simple table representation
        """
        content = block.get('content', [])
        if not content:
            return ""
        
        result = []
        for row in content:
            if row.get('type') != 'table_row':
                continue
            
            cells = []
            for cell in row.get('content', []):
                cell_text = JiraTextConverter._convert_adf_inline(cell.get('content', []))
                cells.append(cell_text)
            
            if cells:
                result.append(' | '.join(cells))
        
        return '\n'.join(result)

    @staticmethod
    def _convert_wiki_markup(text: str) -> str:
        """
        Convert Jira wiki markup to plain text.
        
        Handles: bold, italic, strikethrough, code, headings, lists, etc.
        
        Args:
            text: Text with wiki markup
            
        Returns:
            Converted plain text
        """
        # Convert wiki markup patterns to markdown-like format
        # Jira wiki: *bold* -> markdown: **bold**
        text = text.replace('*', '**')
        
        # Jira wiki: _italic_ -> markdown: *italic*  
        # (but avoid double conversion)
        import re
        text = re.sub(r'_([^_]+)_', r'*\1*', text)
        
        # Jira wiki: -strikethrough- -> ~~strikethrough~~
        text = re.sub(r'-([^-]+)-', r'~~\1~~', text)
        
        # Jira wiki: {{code}} -> `code`
        text = re.sub(r'{{([^}]+)}}', r'`\1`', text)
        
        # Jira wiki: h1. Heading -> # Heading
        text = re.sub(r'^h(\d)\. ', lambda m: '#' * int(m.group(1)) + ' ', text, flags=re.MULTILINE)
        
        # Jira wiki: [Link|URL] -> [Link](URL)
        text = re.sub(r'\[([^|\]]+)\|([^\]]+)\]', r'[\1](\2)', text)
        
        # Clean up any remaining Jira-specific syntax
        text = text.replace('\\', '')  # Remove escape characters
        
        return text.strip()


# Convenience function
def convert_jira_text(text: Optional[str]) -> str:
    """
    Convenience function to convert Jira formatted text.
    
    Args:
        text: Jira formatted text
        
    Returns:
        Converted plain text
    """
    return JiraTextConverter.convert(text)
