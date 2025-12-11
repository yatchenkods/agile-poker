"""Input validators"""

from typing import List


VALID_STORY_POINTS = [1, 2, 4, 8, 16]


def validate_story_points(points: int) -> bool:
    """Validate story points are valid Fibonacci numbers"""
    return points in VALID_STORY_POINTS


def validate_email(email: str) -> bool:
    """Simple email validation"""
    return "@" in email and "." in email.split("@")[1]


def get_consensus_estimate(estimates: List[int]) -> tuple[int, bool]:
    """Get consensus estimate from list of estimates
    
    Returns: (final_estimate, is_consensus)
    Consensus is reached if max - min <= 2
    """
    if not estimates:
        return None, False
    
    points = sorted(estimates)
    variance = max(points) - min(points)
    
    # Check if consensus
    is_consensus = variance <= 2
    
    # Calculate average and round to nearest valid score
    avg = sum(points) / len(points)
    final = min(VALID_STORY_POINTS, key=lambda x: abs(x - avg))
    
    return final, is_consensus
