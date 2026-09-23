using System.ComponentModel.DataAnnotations;

namespace CompoundCA.Api.Models;

public sealed class ProjectionRequest
{
    [Range(0d, 1_000_000_000d)]
    public required double Starting { get; init; }

    [Range(0d, 1_000_000d)]
    public required double Monthly { get; init; }

    [Range(0d, 100d)]
    public required double Rate { get; init; }

    [Range(0, 100)]
    public required int Years { get; init; }

    [Required]
    [RegularExpression("^(TFSA|RRSP|Taxable)$")]
    public required string Account { get; init; }
}
