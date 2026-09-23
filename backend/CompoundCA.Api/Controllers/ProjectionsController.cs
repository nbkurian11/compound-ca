using CompoundCA.Api.Models;
using CompoundCA.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CompoundCA.Api.Controllers;

[ApiController]
[Route("api/projections")]
public sealed class ProjectionsController(ProjectionService projections) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType<ProjectionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public ActionResult<ProjectionResponse> Create(ProjectionRequest request) =>
        Ok(projections.Calculate(request));
}
